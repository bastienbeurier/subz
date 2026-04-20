import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminAuth } from "@/lib/utils/adminAuth";

const createSchema = z.object({
  video_id: z.string().uuid(),
  start_ms: z.number().int().min(0),
  end_ms: z.number().int().min(1),
  text: z.string().min(1).max(500),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  start_ms: z.number().int().min(0).optional(),
  end_ms: z.number().int().min(1).optional(),
  text: z.string().min(1).max(500).optional(),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
});

export async function GET(req: Request) {
  try {
    const authError = await requireAdminAuth();
    if (authError) return authError;

    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get("video_id");
    if (!videoId) return NextResponse.json({ error: "Missing video_id" }, { status: 400 });

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("video_subtitles")
      .select()
      .eq("video_id", videoId)
      .order("start_ms");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    console.error("[video-subtitles GET]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authError = await requireAdminAuth();
    if (authError) return authError;

    const body = await req.json().catch(() => ({}));
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    if (parsed.data.end_ms <= parsed.data.start_ms) {
      return NextResponse.json({ error: "end_ms must be greater than start_ms" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("video_subtitles")
      .insert(parsed.data)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    console.error("[video-subtitles POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  const body = await req.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { id, ...updates } = parsed.data;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("video_subtitles")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  const body = await req.json().catch(() => ({}));
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("video_subtitles")
    .delete()
    .eq("id", parsed.data.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
