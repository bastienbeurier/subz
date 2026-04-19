import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { calculateRoundScores } from "@/lib/game/scoring";
import {
  TOTAL_ROUNDS,
  VOTING_DURATION_MS,
  ROUND_RESULTS_DURATION_MS,
  FINAL_DURATION_MS,
} from "@/types/game";
import type { Answer, Player } from "@/types/game";

const schema = z.object({
  roomId: z.string().uuid(),
  expectedPhase: z.string(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { roomId, expectedPhase } = parsed.data;
  const supabase = createServiceClient();

  // Fetch current room
  const { data: room } = await supabase
    .from("rooms")
    .select()
    .eq("id", roomId)
    .eq("is_deleted", false)
    .single();

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  // Idempotency guard — if already transitioned, silently succeed
  if (room.phase !== expectedPhase) {
    return NextResponse.json({ ok: true, phase: room.phase });
  }

  const now = new Date();

  switch (expectedPhase) {
    case "prompt": {
      // prompt → answering
      const { error } = await supabase
        .from("rooms")
        .update({ phase: "answering" })
        .eq("id", roomId)
        .eq("phase", "prompt");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      break;
    }

    case "answering": {
      // answering → diffusion: randomize display_order on answers
      const { data: answers } = await supabase
        .from("answers")
        .select("id")
        .eq("room_id", roomId)
        .eq("round", room.current_round);

      if (answers && answers.length > 0) {
        const shuffled = [...answers].sort(() => Math.random() - 0.5);
        await Promise.all(
          shuffled.map((a, i) =>
            supabase
              .from("answers")
              .update({ display_order: i })
              .eq("id", a.id)
          )
        );
      }

      const { error } = await supabase
        .from("rooms")
        .update({ phase: "diffusion", diffusion_index: 0 })
        .eq("id", roomId)
        .eq("phase", "answering");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      break;
    }

    case "diffusion": {
      // diffusion → voting
      const votingDeadline = new Date(now.getTime() + VOTING_DURATION_MS).toISOString();
      const { error } = await supabase
        .from("rooms")
        .update({ phase: "voting", voting_deadline: votingDeadline })
        .eq("id", roomId)
        .eq("phase", "diffusion");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      break;
    }

    case "voting": {
      // voting → round_results: tally scores
      const { data: answers } = await supabase
        .from("answers")
        .select()
        .eq("room_id", roomId)
        .eq("round", room.current_round);

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

      const autoAdvanceAt = new Date(now.getTime() + ROUND_RESULTS_DURATION_MS).toISOString();
      const { error } = await supabase
        .from("rooms")
        .update({ phase: "round_results", auto_advance_at: autoAdvanceAt })
        .eq("id", roomId)
        .eq("phase", "voting");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      break;
    }

    case "round_results": {
      const isLastRound = room.current_round >= TOTAL_ROUNDS;

      if (isLastRound) {
        // → final
        const autoAdvanceAt = new Date(now.getTime() + FINAL_DURATION_MS).toISOString();
        const { error } = await supabase
          .from("rooms")
          .update({ phase: "final", auto_advance_at: autoAdvanceAt })
          .eq("id", roomId)
          .eq("phase", "round_results");
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      } else {
        // → next prompt: pick next video
        const nextRound = room.current_round + 1;
        const usedIds: string[] = room.used_video_ids ?? [];

        let { data: video } = await supabase
          .from("videos")
          .select("id")
          .eq("is_active", true)
          .not("id", "in", `(${usedIds.join(",")})`)
          .order("id")
          .limit(1)
          .maybeSingle();

        // Fallback: reset pool and pick fresh
        if (!video) {
          const { data: anyVideo } = await supabase
            .from("videos")
            .select("id")
            .eq("is_active", true)
            .order("id")
            .limit(1)
            .maybeSingle();
          video = anyVideo;
        }

        const newUsedIds = video
          ? [...usedIds, video.id]
          : usedIds;

        const { error } = await supabase
          .from("rooms")
          .update({
            phase: "prompt",
            current_round: nextRound,
            current_video_id: video?.id ?? null,
            used_video_ids: newUsedIds,
            diffusion_index: 0,
            answering_deadline: null,
            voting_deadline: null,
            auto_advance_at: null,
          })
          .eq("id", roomId)
          .eq("phase", "round_results");
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }
      break;
    }

    case "final": {
      // → lobby: full reset
      await supabase
        .from("players")
        .update({ score: 0, is_ready: false })
        .eq("room_id", roomId)
        .eq("is_kicked", false);

      // Delete answers and votes for this room
      await supabase.from("votes").delete().eq("room_id", roomId);
      await supabase.from("answers").delete().eq("room_id", roomId);

      const { error } = await supabase
        .from("rooms")
        .update({
          phase: "lobby",
          current_round: 0,
          current_video_id: null,
          used_video_ids: [],
          diffusion_index: 0,
          answering_deadline: null,
          voting_deadline: null,
          auto_advance_at: null,
        })
        .eq("id", roomId)
        .eq("phase", "final");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      break;
    }

    default:
      return NextResponse.json({ error: "Unknown phase" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
