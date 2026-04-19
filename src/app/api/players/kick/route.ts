import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";

const schema = z.object({
  kickerId: z.string().uuid(),
  targetId: z.string().uuid(),
  roomId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { kickerId, targetId, roomId } = parsed.data;
  const supabase = createServiceClient();

  // Verify both players are in the room
  const { data: players } = await supabase
    .from("players")
    .select("id")
    .eq("room_id", roomId)
    .in("id", [kickerId, targetId])
    .eq("is_kicked", false);

  if (!players || players.length < 2) {
    return NextResponse.json({ error: "Invalid players" }, { status: 400 });
  }

  const { data: room } = await supabase
    .from("rooms")
    .select("phase, current_round")
    .eq("id", roomId)
    .single();

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  // Kick the player
  await supabase
    .from("players")
    .update({ is_kicked: true, is_connected: false })
    .eq("id", targetId);

  // Remove their answer and vote for the current round if game is active
  if (room.current_round > 0) {
    const { data: targetAnswer } = await supabase
      .from("answers")
      .select("id")
      .eq("room_id", roomId)
      .eq("player_id", targetId)
      .eq("round", room.current_round)
      .maybeSingle();

    if (targetAnswer) {
      await supabase.from("votes").delete().eq("answer_id", targetAnswer.id);
      await supabase.from("answers").delete().eq("id", targetAnswer.id);
    }
    await supabase
      .from("votes")
      .delete()
      .eq("room_id", roomId)
      .eq("round", room.current_round)
      .eq("voter_player_id", targetId);
  }

  // Re-check phase completion after kick (e.g. everyone else may have submitted/voted)
  if (room.phase === "answering") {
    const { count: playerCount } = await supabase
      .from("players")
      .select("*", { count: "exact", head: true })
      .eq("room_id", roomId)
      .eq("is_connected", true)
      .eq("is_kicked", false);

    const { count: answerCount } = await supabase
      .from("answers")
      .select("*", { count: "exact", head: true })
      .eq("room_id", roomId)
      .eq("round", room.current_round);

    if ((playerCount ?? 0) > 0 && answerCount === playerCount) {
      const answers = await supabase
        .from("answers")
        .select("id")
        .eq("room_id", roomId)
        .eq("round", room.current_round);

      if (answers.data) {
        const ordered = [...answers.data].sort(() => Math.random() - 0.5);
        await Promise.all(
          ordered.map((a, i) =>
            supabase.from("answers").update({ display_order: i }).eq("id", a.id)
          )
        );
      }
      await supabase
        .from("rooms")
        .update({ phase: "diffusion", diffusion_index: 0 })
        .eq("id", roomId)
        .eq("phase", "answering");
    }
  }

  return NextResponse.json({ ok: true });
}
