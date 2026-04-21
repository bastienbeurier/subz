import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { generateRoomCode } from "@/lib/game/roomCode";
import { AVATAR_COLORS } from "@/types/game";

const schema = z.object({
  pseudo: z
    .string()
    .min(1)
    .max(16)
    .regex(/^[a-zA-Z0-9 _-]+$/),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  const { pseudo } = parsed.data;
  const supabase = createServiceClient();

  // Generate a unique room code (retry on collision)
  let code = generateRoomCode();
  let attempts = 0;
  while (attempts < 5) {
    const { data: existing } = await supabase
      .from("rooms")
      .select("id")
      .eq("code", code)
      .eq("is_deleted", false)
      .maybeSingle();
    if (!existing) break;
    code = generateRoomCode();
    attempts++;
  }

  // Create the room
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .insert({ code, phase: "lobby" })
    .select()
    .single();

  if (roomError || !room) {
    console.error("Create room error:", roomError);
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
  }

  // Create the player
  const avatarIndex = 0;
  const color = AVATAR_COLORS[avatarIndex];
  const { data: player, error: playerError } = await supabase
    .from("players")
    .insert({
      room_id: room.id,
      pseudo,
      color,
      avatar_index: avatarIndex,
    })
    .select()
    .single();

  if (playerError || !player) {
    console.error("Create player error:", playerError);
    return NextResponse.json({ error: "Failed to create player" }, { status: 500 });
  }

  const { data: updatedRoom } = await supabase
    .from("rooms")
    .update({ creator_id: player.id })
    .eq("id", room.id)
    .select()
    .single();

  return NextResponse.json({ room: updatedRoom ?? room, player }, { status: 201 });
}
