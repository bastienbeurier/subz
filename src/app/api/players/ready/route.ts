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

  // Mark this player ready
  await supabase
    .from("players")
    .update({ is_ready: true })
    .eq("id", playerId)
    .eq("room_id", roomId);

  // Check if all connected, non-kicked players are now ready
  const { data: notReady, count: notReadyCount } = await supabase
    .from("players")
    .select("id", { count: "exact" })
    .eq("room_id", roomId)
    .eq("is_connected", true)
    .eq("is_kicked", false)
    .eq("is_ready", false);

  const { count: totalCount } = await supabase
    .from("players")
    .select("*", { count: "exact", head: true })
    .eq("room_id", roomId)
    .eq("is_connected", true)
    .eq("is_kicked", false);

  // All ready and at least 2 players — start game
  if (notReadyCount === 0 && (totalCount ?? 0) >= 2) {
    // Pick the first video
    const { data: video } = await supabase
      .from("videos")
      .select("id")
      .eq("is_active", true)
      .order("id") // deterministic first pick
      .limit(1)
      .maybeSingle();

    const videoId = video?.id ?? null;

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

  void notReady; // suppress unused variable warning

  return NextResponse.json({ ok: true });
}
