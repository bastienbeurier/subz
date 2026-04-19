import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";

const schema = z.object({
  roomId: z.string().uuid(),
  voterId: z.string().uuid(),
  answerId: z.string().uuid(),
  round: z.number().int().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { roomId, voterId, answerId, round } = parsed.data;
  const supabase = createServiceClient();

  const { data: room } = await supabase
    .from("rooms")
    .select("phase, current_round")
    .eq("id", roomId)
    .eq("is_deleted", false)
    .single();

  if (!room || room.phase !== "voting" || room.current_round !== round) {
    return NextResponse.json({ error: "Not in voting phase" }, { status: 409 });
  }

  // Ensure voter isn't voting for their own answer
  const { data: answer } = await supabase
    .from("answers")
    .select("player_id")
    .eq("id", answerId)
    .single();

  if (!answer) {
    return NextResponse.json({ error: "Answer not found" }, { status: 404 });
  }
  if (answer.player_id === voterId) {
    return NextResponse.json({ error: "Cannot vote for your own answer" }, { status: 400 });
  }

  // Atomic upsert on the unique (room_id, round, voter_player_id) constraint.
  // Previous DELETE+INSERT raced with the vote_count triggers (the row was
  // briefly missing and counts off-by-one). Migration 009 adds an UPDATE
  // trigger that moves the count from OLD.answer_id → NEW.answer_id when a
  // voter swaps picks, so the count stays correct on this single round-trip.
  const { error: voteError } = await supabase.from("votes").upsert(
    {
      room_id: roomId,
      round,
      voter_player_id: voterId,
      answer_id: answerId,
    },
    { onConflict: "room_id,round,voter_player_id" }
  );

  if (voteError) {
    return NextResponse.json({ error: voteError.message }, { status: 500 });
  }

  // Scoring and phase transition are handled exclusively by advance-phase (voting case).
  // Clients detect all-voted via Realtime (votes count === connected player count) and
  // call POST /api/game/advance-phase with expectedPhase:"voting". This avoids a race
  // condition where both this route and the voting deadline timer would tally scores.

  return NextResponse.json({ ok: true });
}
