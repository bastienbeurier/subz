import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";

const schema = z.object({
  playerId: z.string().uuid(),
  roomCode: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { playerId, roomCode } = parsed.data;
  const supabase = createServiceClient();

  // Find the room
  const { data: room } = await supabase
    .from("rooms")
    .select()
    .eq("code", roomCode.toUpperCase())
    .eq("is_deleted", false)
    .maybeSingle();

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  // Find the player
  const { data: player } = await supabase
    .from("players")
    .select()
    .eq("id", playerId)
    .eq("room_id", room.id)
    .maybeSingle();

  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  // Mark player as reconnected
  await supabase
    .from("players")
    .update({ is_connected: true, last_seen_at: new Date().toISOString() })
    .eq("id", playerId);

  return NextResponse.json({ room, player });
}
