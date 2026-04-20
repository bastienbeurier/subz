import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminAuth } from "@/lib/utils/adminAuth";

const patchSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).optional(),
  is_active: z.boolean().optional(),
  subtitle_start_ms: z.number().int().min(0).optional(),
  subtitle_end_ms: z.number().int().min(1).optional(),
});

export async function GET() {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("videos")
    .select()
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { id, ...updates } = parsed.data;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("videos")
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

  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = createServiceClient();

  const { data: video } = await supabase
    .from("videos")
    .select("storage_path")
    .eq("id", id)
    .single();

  if (video?.storage_path) {
    await supabase.storage.from("videos").remove([video.storage_path]);
  }

  // ON DELETE SET NULL on the FK handles rooms.current_video_id automatically
  const { error } = await supabase.from("videos").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
