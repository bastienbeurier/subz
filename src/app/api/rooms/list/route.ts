import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { MAX_PLAYERS } from "@/types/game";

export async function GET() {
  const supabase = createServiceClient();

  const staleThreshold = new Date(Date.now() - 15_000).toISOString();

  // Soft-delete lobby rooms where no player has been seen recently.
  // These are abandoned test/ghost rooms that no heartbeat will ever clean up.
  const { data: deadRooms } = await supabase
    .from("rooms")
    .select("id")
    .eq("phase", "lobby")
    .eq("is_deleted", false);

  if (deadRooms && deadRooms.length > 0) {
    const deadRoomIds: string[] = [];
    await Promise.all(
      deadRooms.map(async (room) => {
        const { count } = await supabase
          .from("players")
          .select("*", { count: "exact", head: true })
          .eq("room_id", room.id)
          .gte("last_seen_at", staleThreshold);
        if ((count ?? 0) === 0) deadRoomIds.push(room.id);
      })
    );
    if (deadRoomIds.length > 0) {
      await supabase
        .from("rooms")
        .update({ is_deleted: true })
        .in("id", deadRoomIds);
    }
  }

  // Now fetch only the rooms that survived cleanup (all phases)
  const { data: rooms, error } = await supabase
    .from("rooms")
    .select("id, code, language, phase")
    .eq("is_deleted", false)
    .not("phase", "eq", "final")
    .order("created_at", { ascending: false });

  if (error || !rooms) {
    return NextResponse.json({ error: "Failed to fetch rooms" }, { status: 500 });
  }

  const results = await Promise.all(
    rooms.map(async (room) => {
      const { count } = await supabase
        .from("players")
        .select("*", { count: "exact", head: true })
        .eq("room_id", room.id)
        .gte("last_seen_at", staleThreshold);

      return {
        code: room.code,
        language: room.language as string,
        phase: room.phase as string,
        playerCount: count ?? 0,
        maxPlayers: MAX_PLAYERS,
      };
    })
  );

  const visibleRooms = results.filter((r) => r.playerCount > 0);

  return NextResponse.json({ rooms: visibleRooms });
}
