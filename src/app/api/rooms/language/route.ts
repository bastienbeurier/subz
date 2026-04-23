import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";

const schema = z.object({
  roomId: z.string().uuid(),
  playerId: z.string().uuid(),
  language: z.enum(["en", "fr"]),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { roomId, playerId, language } = parsed.data;
  const supabase = createServiceClient();

  const { data: room } = await supabase
    .from("rooms")
    .select("id, phase, creator_id")
    .eq("id", roomId)
    .eq("is_deleted", false)
    .single();

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  if (room.phase !== "lobby") {
    return NextResponse.json({ error: "Can only change language in lobby" }, { status: 400 });
  }
  if (room.creator_id !== playerId) {
    return NextResponse.json({ error: "Only the host can change the language" }, { status: 403 });
  }

  const { error } = await supabase
    .from("rooms")
    .update({ language })
    .eq("id", roomId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, language });
}
