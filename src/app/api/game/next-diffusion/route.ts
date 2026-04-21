import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { VOTING_DURATION_MS, DIFFUSION_STEP_BUFFER_MS } from "@/types/game";

const schema = z.object({
  roomId: z.string().uuid(),
  currentIndex: z.number().int().min(0),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { roomId, currentIndex } = parsed.data;
  const supabase = createServiceClient();

  const { data: room } = await supabase
    .from("rooms")
    .select("phase, current_round, diffusion_index, current_video_id")
    .eq("id", roomId)
    .eq("is_deleted", false)
    .single();

  if (!room || room.phase !== "diffusion") {
    return NextResponse.json({ error: "Not in diffusion phase" }, { status: 409 });
  }

  // Idempotency: ignore if already past this index
  if (room.diffusion_index !== currentIndex) {
    return NextResponse.json({ ok: true, diffusion_index: room.diffusion_index });
  }

  const [{ count: answerCount }, videoResult] = await Promise.all([
    supabase
      .from("answers")
      .select("*", { count: "exact", head: true })
      .eq("room_id", roomId)
      .eq("round", room.current_round),
    room.current_video_id
      ? supabase.from("videos").select("duration_ms").eq("id", room.current_video_id).single()
      : Promise.resolve({ data: null }),
  ]);

  const videoDurationMs = videoResult.data?.duration_ms ?? 30_000;
  const nextIndex = currentIndex + 1;

  if (nextIndex >= (answerCount ?? 0)) {
    // All clips played → voting
    const votingDeadline = new Date(Date.now() + VOTING_DURATION_MS).toISOString();
    await supabase
      .from("rooms")
      .update({ phase: "voting", voting_deadline: votingDeadline, diffusion_index: nextIndex, auto_advance_at: null })
      .eq("id", roomId)
      .eq("phase", "diffusion");
  } else {
    const stepDeadline = new Date(Date.now() + videoDurationMs + DIFFUSION_STEP_BUFFER_MS).toISOString();
    await supabase
      .from("rooms")
      .update({ diffusion_index: nextIndex, auto_advance_at: stepDeadline })
      .eq("id", roomId)
      .eq("diffusion_index", currentIndex);
  }

  return NextResponse.json({ ok: true });
}
