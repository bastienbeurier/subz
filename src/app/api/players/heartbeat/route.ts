import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";

const schema = z.object({
  playerId: z.string().uuid(),
  roomId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { playerId, roomId } = parsed.data;
  const supabase = createServiceClient();

  const now = new Date().toISOString();

  await supabase
    .from("players")
    .update({ is_connected: true, last_seen_at: now })
    .eq("id", playerId)
    .eq("room_id", roomId);

  // Update room activity
  await supabase
    .from("rooms")
    .update({ last_activity_at: now })
    .eq("id", roomId);

  const staleThreshold = new Date(Date.now() - 30_000).toISOString();

  // Mark individually stale players as disconnected so game-advancement logic
  // (allAnswered / allVoted) stops waiting for them.
  await supabase
    .from("players")
    .update({ is_connected: false })
    .eq("room_id", roomId)
    .eq("is_connected", true)
    .lt("last_seen_at", staleThreshold);

  // Soft-delete room if no players have been seen recently
  const { count } = await supabase
    .from("players")
    .select("*", { count: "exact", head: true })
    .eq("room_id", roomId)
    .gte("last_seen_at", staleThreshold);

  if (count === 0) {
    await supabase
      .from("rooms")
      .update({ is_deleted: true })
      .eq("id", roomId);
    return NextResponse.json({ ok: true });
  }

  // Transfer creator role if the current creator has gone stale
  const { data: room } = await supabase
    .from("rooms")
    .select("creator_id, phase")
    .eq("id", roomId)
    .single();

  if (room && room.phase === "lobby" && room.creator_id) {
    const { data: creator } = await supabase
      .from("players")
      .select("last_seen_at")
      .eq("id", room.creator_id)
      .maybeSingle();

    const isCreatorStale =
      !creator || new Date(creator.last_seen_at) < new Date(Date.now() - 30_000);

    if (isCreatorStale) {
      const { data: activePlayers } = await supabase
        .from("players")
        .select("id")
        .eq("room_id", roomId)
        .gte("last_seen_at", staleThreshold)
        .order("created_at", { ascending: true })
        .limit(1);

      const newCreatorId = activePlayers?.[0]?.id ?? null;
      if (newCreatorId) {
        await supabase
          .from("rooms")
          .update({ creator_id: newCreatorId })
          .eq("id", roomId);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
