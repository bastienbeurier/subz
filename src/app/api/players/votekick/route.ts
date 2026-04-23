import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";

const schema = z.object({
  voterId: z.string().uuid(),
  targetId: z.string().uuid(),
  roomId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { voterId, targetId, roomId } = parsed.data;

  if (voterId === targetId) {
    return NextResponse.json({ error: "Cannot kick yourself" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Fetch voter and target to ensure both are connected in the room
  const { data: players } = await supabase
    .from("players")
    .select("id, pseudo, is_connected")
    .eq("room_id", roomId)
    .eq("is_connected", true);

  if (!players) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const connectedCount = players.length;

  if (connectedCount <= 2) {
    return NextResponse.json(
      { error: "Au moins 3 joueurs sont nécessaires pour voter un expulsion" },
      { status: 400 }
    );
  }

  const voter = players.find((p) => p.id === voterId);
  const target = players.find((p) => p.id === targetId);

  if (!voter) {
    return NextResponse.json({ error: "Voter not in room" }, { status: 403 });
  }
  if (!target) {
    return NextResponse.json({ error: "Target not in room" }, { status: 404 });
  }

  // Insert vote kick (unique constraint prevents duplicates)
  const { error: insertError } = await supabase.from("vote_kicks").insert({
    room_id: roomId,
    voter_player_id: voterId,
    target_player_id: targetId,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "Vous avez déjà voté pour expulser ce joueur" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Count total votes for this target in this room
  const { count: voteCount } = await supabase
    .from("vote_kicks")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId)
    .eq("target_player_id", targetId);

  const votes = voteCount ?? 1;
  // Eligible voters = all connected players except the target
  const eligible = connectedCount - 1;
  // Strictly more than half
  const needed = Math.floor(eligible / 2) + 1;

  // Insert chat message indicating the vote
  const kickVoteText = JSON.stringify({
    voter_pseudo: voter.pseudo,
    target_pseudo: target.pseudo,
    votes,
    needed,
  });

  await supabase.from("messages").insert({
    room_id: roomId,
    player_id: null,
    type: "kick_vote",
    text: kickVoteText,
  });

  if (votes >= needed) {
    // Kick the player: delete their record (cascades clean up their data)
    await supabase.from("players").delete().eq("id", targetId);

    // Clean up all vote_kicks targeting this player in this room
    await supabase
      .from("vote_kicks")
      .delete()
      .eq("room_id", roomId)
      .eq("target_player_id", targetId);

    // Insert kick notification message
    const kickText = JSON.stringify({ target_pseudo: target.pseudo });
    await supabase.from("messages").insert({
      room_id: roomId,
      player_id: null,
      type: "kick",
      text: kickText,
    });

    return NextResponse.json({ ok: true, kicked: true });
  }

  return NextResponse.json({ ok: true, kicked: false, votes, needed });
}
