import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { generateRoomCode } from "@/lib/game/roomCode";
import { AVATAR_COLORS, MAX_PLAYERS } from "@/types/game";

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

  // Find an open lobby with room for more players
  const { data: openRooms } = await supabase
    .from("rooms")
    .select("id, code, current_round")
    .eq("phase", "lobby")
    .eq("is_deleted", false)
    .order("created_at", { ascending: true })
    .limit(10);

  let targetRoom = null;

  if (openRooms && openRooms.length > 0) {
    // Find the first room that isn't full
    for (const candidate of openRooms) {
      const { count } = await supabase
        .from("players")
        .select("*", { count: "exact", head: true })
        .eq("room_id", candidate.id)
        .eq("is_connected", true);

      if ((count ?? 0) < MAX_PLAYERS) {
        targetRoom = candidate;
        break;
      }
    }
  }

  // No open room found — create one
  if (!targetRoom) {
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

    const { data: newRoom, error } = await supabase
      .from("rooms")
      .insert({ code, phase: "lobby" })
      .select()
      .single();

    if (error || !newRoom) {
      return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
    }
    targetRoom = newRoom;
  }

  // Fetch full room row if we only have partial data
  const { data: room } = await supabase
    .from("rooms")
    .select()
    .eq("id", targetRoom.id)
    .single();

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 500 });
  }

  // Assign avatar. Unique index on (room_id, avatar_index) catches concurrent
  // joiners racing for the same slot — retry on conflict. If the room fills up
  // between matching and inserting, fall through to "Room is full".
  for (let attempt = 0; attempt < MAX_PLAYERS; attempt++) {
    const { data: existingPlayers } = await supabase
      .from("players")
      .select("avatar_index")
      .eq("room_id", room.id);

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
      .insert({ room_id: room.id, pseudo, color, avatar_index: avatarIndex })
      .select()
      .single();

    if (!playerError && player) {
      return NextResponse.json({ room, player }, { status: 201 });
    }

    if (playerError?.code !== "23505") {
      return NextResponse.json({ error: "Failed to join room" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Room is full" }, { status: 409 });
}
