import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { calculateRoundScores } from "@/lib/game/scoring";
import { ROUND_RESULTS_DURATION_MS } from "@/types/game";
import type { Answer, Player } from "@/types/game";

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

  // Insert vote (upsert: replace previous vote if changed)
  // First delete existing vote from this voter this round
  await supabase
    .from("votes")
    .delete()
    .eq("room_id", roomId)
    .eq("round", round)
    .eq("voter_player_id", voterId);

  const { error: voteError } = await supabase.from("votes").insert({
    room_id: roomId,
    round,
    voter_player_id: voterId,
    answer_id: answerId,
  });

  if (voteError) {
    return NextResponse.json({ error: voteError.message }, { status: 500 });
  }

  // Check if all connected players have voted
  const { count: playerCount } = await supabase
    .from("players")
    .select("*", { count: "exact", head: true })
    .eq("room_id", roomId)
    .eq("is_connected", true)
    .eq("is_kicked", false);

  const { count: voteCount } = await supabase
    .from("votes")
    .select("*", { count: "exact", head: true })
    .eq("room_id", roomId)
    .eq("round", round);

  if ((playerCount ?? 0) > 0 && voteCount === playerCount) {
    // All voted — tally scores and advance
    const { data: answers } = await supabase
      .from("answers")
      .select()
      .eq("room_id", roomId)
      .eq("round", round);

    const { data: players } = await supabase
      .from("players")
      .select()
      .eq("room_id", roomId)
      .eq("is_connected", true)
      .eq("is_kicked", false);

    if (answers && players) {
      const scores = calculateRoundScores(
        answers as Answer[],
        players as Player[]
      );
      await Promise.all(
        Array.from(scores.entries()).map(([playerId, pts]) => {
          const player = (players as Player[]).find((p) => p.id === playerId);
          if (!player) return Promise.resolve();
          return supabase
            .from("players")
            .update({ score: player.score + pts })
            .eq("id", playerId);
        })
      );
    }

    const autoAdvanceAt = new Date(Date.now() + ROUND_RESULTS_DURATION_MS).toISOString();
    await supabase
      .from("rooms")
      .update({ phase: "round_results", auto_advance_at: autoAdvanceAt })
      .eq("id", roomId)
      .eq("phase", "voting");
  }

  return NextResponse.json({ ok: true });
}
