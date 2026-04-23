import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { ANSWERING_DURATION_MS } from "@/types/game";

const schema = z.object({
  roomId: z.string().uuid(),
  playerId: z.string().uuid(),
  text: z.string().min(1).max(120),
  round: z.number().int().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { roomId, playerId, text, round } = parsed.data;
  const supabase = createServiceClient();

  const { data: room } = await supabase
    .from("rooms")
    .select("phase, current_round, answering_deadline")
    .eq("id", roomId)
    .eq("is_deleted", false)
    .single();

  if (!room || room.phase !== "answering" || room.current_round !== round) {
    return NextResponse.json({ error: "Not in answering phase" }, { status: 409 });
  }

  // Upsert the answer — allows re-submit while timer is still running.
  // Phase advance + display_order shuffle are owned exclusively by advance-phase
  // (client fires it when all-answered is detected via Realtime, or on timer
  // expiry). This avoids a race that could corrupt display_order.
  const { error: answerError } = await supabase.from("answers").upsert(
    { room_id: roomId, player_id: playerId, round, text },
    { onConflict: "room_id,player_id,round" }
  );

  if (answerError) {
    return NextResponse.json({ error: answerError.message }, { status: 500 });
  }

  // Start the countdown on the first submission. Use IS NULL as the WHERE
  // condition so concurrent submissions only write the deadline once.
  if (!room.answering_deadline) {
    const deadline = new Date(Date.now() + ANSWERING_DURATION_MS).toISOString();
    await supabase
      .from("rooms")
      .update({ answering_deadline: deadline })
      .eq("id", roomId)
      .is("answering_deadline", null);
  }

  return NextResponse.json({ ok: true });
}
