import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { VOTING_DURATION_MS } from "@/types/game";

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
    .select("phase, current_round, diffusion_index")
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

  const { count: answerCount } = await supabase
    .from("answers")
    .select("*", { count: "exact", head: true })
    .eq("room_id", roomId)
    .eq("round", room.current_round);

  const nextIndex = currentIndex + 1;

  if (nextIndex >= (answerCount ?? 0)) {
    // All clips played → voting
    const votingDeadline = new Date(Date.now() + VOTING_DURATION_MS).toISOString();
    await supabase
      .from("rooms")
      .update({ phase: "voting", voting_deadline: votingDeadline, diffusion_index: nextIndex })
      .eq("id", roomId)
      .eq("phase", "diffusion");
  } else {
    await supabase
      .from("rooms")
      .update({ diffusion_index: nextIndex })
      .eq("id", roomId)
      .eq("diffusion_index", currentIndex);
  }

  return NextResponse.json({ ok: true });
}
