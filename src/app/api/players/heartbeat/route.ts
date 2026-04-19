import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";

const schema = z.object({
  playerId: z.string().uuid(),
  roomId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { playerId, roomId } = parsed.data;
  const supabase = createServiceClient();

  const now = new Date().toISOString();

  await supabase
    .from("players")
    .update({ is_connected: true, last_seen_at: now })
    .eq("id", playerId)
    .eq("room_id", roomId);

  // Update room activity
  await supabase
    .from("rooms")
    .update({ last_activity_at: now })
    .eq("id", roomId);

  // Soft-delete room if no players have been seen recently
  const staleThreshold = new Date(Date.now() - 30_000).toISOString();
  const { count } = await supabase
    .from("players")
    .select("*", { count: "exact", head: true })
    .eq("room_id", roomId)
    .eq("is_kicked", false)
    .gte("last_seen_at", staleThreshold);

  if (count === 0) {
    await supabase
      .from("rooms")
      .update({ is_deleted: true })
      .eq("id", roomId);
  }

  return NextResponse.json({ ok: true });
}
