import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { MAX_PLAYERS } from "@/types/game";

export async function GET() {
  const supabase = createServiceClient();

  const { data: rooms, error } = await supabase
    .from("rooms")
    .select("id, code, language")
    .eq("phase", "lobby")
    .eq("is_deleted", false)
    .order("created_at", { ascending: true })
    .limit(20);

  if (error || !rooms) {
    return NextResponse.json({ error: "Failed to fetch rooms" }, { status: 500 });
  }

  const results = await Promise.all(
    rooms.map(async (room) => {
      const { count } = await supabase
        .from("players")
        .select("*", { count: "exact", head: true })
        .eq("room_id", room.id)
        .eq("is_connected", true);

      return {
        code: room.code,
        language: room.language as string,
        playerCount: count ?? 0,
        maxPlayers: MAX_PLAYERS,
      };
    })
  );

  const openRooms = results.filter(
    (r) => r.playerCount > 0 && r.playerCount < r.maxPlayers
  );

  return NextResponse.json({ rooms: openRooms });
}
