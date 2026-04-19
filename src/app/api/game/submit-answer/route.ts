import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { ANSWERING_DURATION_MS } from "@/types/game";

const schema = z.object({
  roomId: z.string().uuid(),
  playerId: z.string().uuid(),
  text: z.string().min(1).max(120),
  round: z.number().int().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { roomId, playerId, text, round } = parsed.data;
  const supabase = createServiceClient();

  const { data: room } = await supabase
    .from("rooms")
    .select("phase, current_round, answering_deadline")
    .eq("id", roomId)
    .eq("is_deleted", false)
    .single();

  if (!room || room.phase !== "answering" || room.current_round !== round) {
    return NextResponse.json({ error: "Not in answering phase" }, { status: 409 });
  }

  // Insert answer (upsert to allow re-submit if timer still running)
  const { error: answerError } = await supabase.from("answers").upsert(
    { room_id: roomId, player_id: playerId, round, text },
    { onConflict: "room_id,player_id,round" }
  );

  if (answerError) {
    return NextResponse.json({ error: answerError.message }, { status: 500 });
  }

  // Set deadline on first submission
  if (!room.answering_deadline) {
    const deadline = new Date(Date.now() + ANSWERING_DURATION_MS).toISOString();
    await supabase
      .from("rooms")
      .update({ answering_deadline: deadline })
      .eq("id", roomId)
      .is("answering_deadline", null);
  }

  // Check if all connected, non-kicked players have answered
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
    .eq("round", round);

  if ((playerCount ?? 0) > 0 && answerCount === playerCount) {
    // Everyone answered — advance immediately
    const shuffled = await supabase
      .from("answers")
      .select("id")
      .eq("room_id", roomId)
      .eq("round", round);

    if (shuffled.data) {
      const ordered = [...shuffled.data].sort(() => Math.random() - 0.5);
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

  return NextResponse.json({ ok: true });
}
