import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { AVATAR_COLORS, MAX_PLAYERS } from "@/types/game";

const schema = z.object({
  pseudo: z
    .string()
    .min(1)
    .max(16)
    .regex(/^[a-zA-Z0-9 _-]+$/),
  code: z.string().length(6),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { pseudo, code } = parsed.data;
  const supabase = createServiceClient();

  // Find the room
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select()
    .eq("code", code.toUpperCase())
    .eq("is_deleted", false)
    .maybeSingle();

  if (roomError || !room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  // Count connected players
  const { count } = await supabase
    .from("players")
    .select("*", { count: "exact", head: true })
    .eq("room_id", room.id)
    .eq("is_connected", true)
    .eq("is_kicked", false);

  if ((count ?? 0) >= MAX_PLAYERS) {
    return NextResponse.json({ error: "Room is full" }, { status: 409 });
  }

  // For mid-game joins, record which round they joined
  const joinedRound = room.current_round ?? 0;

  // Assign avatar (pick unused slot). A unique index on
  // (room_id, avatar_index) WHERE is_kicked=false catches concurrent joiners
  // racing for the same slot — retry with the next unused index on conflict.
  for (let attempt = 0; attempt < MAX_PLAYERS; attempt++) {
    const { data: existingPlayers } = await supabase
      .from("players")
      .select("avatar_index")
      .eq("room_id", room.id)
      .eq("is_kicked", false);

    if ((existingPlayers?.length ?? 0) >= MAX_PLAYERS) {
      return NextResponse.json({ error: "Room is full" }, { status: 409 });
    }

    const usedIndexes = new Set((existingPlayers ?? []).map((p) => p.avatar_index));
    let avatarIndex = -1;
    for (let i = 0; i < AVATAR_COLORS.length; i++) {
      if (!usedIndexes.has(i)) {
        avatarIndex = i;
        break;
      }
    }
    if (avatarIndex === -1) {
      return NextResponse.json({ error: "Room is full" }, { status: 409 });
    }
    const color = AVATAR_COLORS[avatarIndex];

    const { data: player, error: playerError } = await supabase
      .from("players")
      .insert({
        room_id: room.id,
        pseudo,
        color,
        avatar_index: avatarIndex,
        joined_round: joinedRound,
      })
      .select()
      .single();

    if (!playerError && player) {
      return NextResponse.json({ room, player }, { status: 201 });
    }

    // 23505 = unique_violation — slot was taken by a concurrent joiner; retry.
    if (playerError?.code !== "23505") {
      console.error("Join player error:", playerError);
      return NextResponse.json({ error: "Failed to join room" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Room is full" }, { status: 409 });
}
