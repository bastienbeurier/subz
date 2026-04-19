import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";

const schema = z.object({
  playerId: z.string().uuid(),
  roomId: z.string().uuid(),
  ready: z.boolean().optional().default(true),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { playerId, roomId, ready } = parsed.data;
  const supabase = createServiceClient();

  // Verify room is in lobby phase
  const { data: room } = await supabase
    .from("rooms")
    .select("id, phase")
    .eq("id", roomId)
    .eq("is_deleted", false)
    .single();

  if (!room || room.phase !== "lobby") {
    return NextResponse.json({ error: "Room not in lobby" }, { status: 409 });
  }

  await supabase
    .from("players")
    .update({ is_ready: ready })
    .eq("id", playerId)
    .eq("room_id", roomId);

  // Unready never triggers a start.
  if (!ready) {
    return NextResponse.json({ ok: true });
  }

  // All connected players ready (≥ 2) → start game. Filtering by
  // is_connected=true here also defends against the edge case where a player
  // disconnected mid-check: we only count who's actually around.
  const { data: connected } = await supabase
    .from("players")
    .select("is_ready")
    .eq("room_id", roomId)
    .eq("is_connected", true);

  const total = connected?.length ?? 0;
  const readyCount = (connected ?? []).filter((p) => p.is_ready).length;

  if (total >= 2 && readyCount === total) {
    // Pick a random first video
    const { data: videos } = await supabase
      .from("videos")
      .select("id")
      .eq("is_active", true);

    const pick = videos && videos.length > 0
      ? videos[Math.floor(Math.random() * videos.length)]
      : null;
    const videoId = pick?.id ?? null;

    await supabase
      .from("rooms")
      .update({
        phase: "prompt",
        current_round: 1,
        current_video_id: videoId,
        used_video_ids: videoId ? [videoId] : [],
      })
      .eq("id", roomId)
      .eq("phase", "lobby"); // idempotency guard
  }

  return NextResponse.json({ ok: true });
}
