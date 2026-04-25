import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { calculateRoundScores } from "@/lib/game/scoring";
import {
  TOTAL_ROUNDS,
  ANSWERING_DURATION_MS,
  VOTING_DURATION_MS,
  ROUND_RESULTS_DURATION_MS,
  FINAL_DURATION_MS,
  PROMPT_BUFFER_MS,
  DIFFUSION_STEP_BUFFER_MS,
  CLOCK_SKEW_BUFFER_MS,
} from "@/types/game";
import type { Answer } from "@/types/game";

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
      // prompt → answering: leave answering_deadline null so the clock only
      // starts when the first answer is submitted (see submit-answer route).
      const { error } = await supabase
        .from("rooms")
        .update({ phase: "answering", answering_deadline: null })
        .eq("id", roomId)
        .eq("phase", "prompt");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      break;
    }

    case "answering": {
      // answering → diffusion: randomize display_order on answers.
      // If no answers were submitted, skip diffusion+voting and go straight to
      // round_results with no scoring (game would otherwise freeze with an
      // empty answer list in DiffusionPhase).
      const { data: answers } = await supabase
        .from("answers")
        .select("id")
        .eq("room_id", roomId)
        .eq("round", room.current_round);

      if (!answers || answers.length === 0) {
        const autoAdvanceAt = new Date(now.getTime() + ROUND_RESULTS_DURATION_MS + CLOCK_SKEW_BUFFER_MS).toISOString();
        const { error } = await supabase
          .from("rooms")
          .update({ phase: "round_results", auto_advance_at: autoAdvanceAt })
          .eq("id", roomId)
          .eq("phase", "answering");
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        break;
      }

      const shuffled = [...answers].sort(() => Math.random() - 0.5);
      await Promise.all(
        shuffled.map((a, i) =>
          supabase
            .from("answers")
            .update({ display_order: i })
            .eq("id", a.id)
        )
      );

      let diffusionDeadline: string | null = null;
      if (room.current_video_id) {
        const { data: vid } = await supabase
          .from("videos")
          .select("duration_ms")
          .eq("id", room.current_video_id)
          .single();
        if (vid) {
          diffusionDeadline = new Date(now.getTime() + vid.duration_ms + DIFFUSION_STEP_BUFFER_MS).toISOString();
        }
      }

      const { error } = await supabase
        .from("rooms")
        .update({ phase: "diffusion", diffusion_index: 0, auto_advance_at: diffusionDeadline })
        .eq("id", roomId)
        .eq("phase", "answering");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      break;
    }

    case "diffusion": {
      // diffusion → voting
      const votingDeadline = new Date(now.getTime() + VOTING_DURATION_MS + CLOCK_SKEW_BUFFER_MS).toISOString();
      const { error } = await supabase
        .from("rooms")
        .update({ phase: "voting", voting_deadline: votingDeadline })
        .eq("id", roomId)
        .eq("phase", "diffusion");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      break;
    }

    case "voting": {
      // voting → round_results: tally scores (sole canonical scorer).
      const { data: answers } = await supabase
        .from("answers")
        .select()
        .eq("room_id", roomId)
        .eq("round", room.current_round);

      if (answers && answers.length > 0) {
        const scores = calculateRoundScores(answers as Answer[]);
        // Fetch authors' current scores so we can apply the delta atomically
        // per row. (No SQL RPC here to keep the migration surface small.)
        const playerIds = Array.from(scores.keys());
        const { data: authors } = await supabase
          .from("players")
          .select("id, score")
          .in("id", playerIds);

        await Promise.all(
          (authors ?? []).map((p) => {
            const pts = scores.get(p.id) ?? 0;
            if (pts === 0) return Promise.resolve();
            return supabase
              .from("players")
              .update({ score: p.score + pts })
              .eq("id", p.id);
          })
        );
      }

      const autoAdvanceAt = new Date(now.getTime() + ROUND_RESULTS_DURATION_MS + CLOCK_SKEW_BUFFER_MS).toISOString();
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
        const autoAdvanceAt = new Date(now.getTime() + FINAL_DURATION_MS + CLOCK_SKEW_BUFFER_MS).toISOString();
        const { error } = await supabase
          .from("rooms")
          .update({ phase: "final", auto_advance_at: autoAdvanceAt })
          .eq("id", roomId)
          .eq("phase", "round_results");
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      } else {
        // → next prompt: pick next video at random, never the video that just
        // played (avoid repeat after pool reset).
        const nextRound = room.current_round + 1;
        const usedIds: string[] = room.used_video_ids ?? [];
        const lastVideoId = room.current_video_id;

        const pickRandom = async (excludeIds: string[]) => {
          let q = supabase.from("videos").select("id, duration_ms").eq("is_active", true);
          if (excludeIds.length > 0) {
            q = q.not("id", "in", `(${excludeIds.join(",")})`);
          }
          const { data } = await q;
          if (!data || data.length === 0) return null;
          return data[Math.floor(Math.random() * data.length)];
        };

        let video = await pickRandom(usedIds);
        let resetPool = false;

        // Pool exhausted — reset and repick, excluding the just-played video
        if (!video) {
          resetPool = true;
          const fallbackExclude = lastVideoId ? [lastVideoId] : [];
          video = await pickRandom(fallbackExclude);
          // Library has only 1 video: allow repeat rather than freeze
          if (!video) video = await pickRandom([]);
        }

        const newUsedIds = video
          ? resetPool
            ? [video.id]
            : [...usedIds, video.id]
          : usedIds;

        const promptDeadline = video
          ? new Date(now.getTime() + video.duration_ms * 2 + PROMPT_BUFFER_MS).toISOString()
          : null;

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
            auto_advance_at: promptDeadline,
          })
          .eq("id", roomId)
          .eq("phase", "round_results");
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }
      break;
    }

    case "final": {
      // → lobby: full reset
      // Drop players who didn't stick around for the auto-restart — otherwise
      // they'd linger in the new lobby holding avatar slots + blocking join.
      await supabase
        .from("players")
        .delete()
        .eq("room_id", roomId)
        .eq("is_connected", false);

      await supabase
        .from("players")
        .update({ score: 0, is_ready: false, joined_round: 0 })
        .eq("room_id", roomId);

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
