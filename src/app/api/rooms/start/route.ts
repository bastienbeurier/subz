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

  const { data: room } = await supabase
    .from("rooms")
    .select("id, phase, creator_id")
    .eq("id", roomId)
    .eq("is_deleted", false)
    .single();

  if (!room || room.phase !== "lobby") {
    return NextResponse.json({ error: "Room not in lobby" }, { status: 409 });
  }

  if (room.creator_id !== playerId) {
    return NextResponse.json({ error: "Only the room creator can start the game" }, { status: 403 });
  }

  const { data: connected } = await supabase
    .from("players")
    .select("id")
    .eq("room_id", roomId)
    .eq("is_connected", true);

  if ((connected?.length ?? 0) < 2) {
    return NextResponse.json({ error: "Need at least 2 players to start" }, { status: 409 });
  }

  // Reset scores for all connected players before starting a new game
  await supabase
    .from("players")
    .update({ score: 0, joined_round: 0 })
    .eq("room_id", roomId)
    .eq("is_connected", true);

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

  return NextResponse.json({ ok: true });
}
