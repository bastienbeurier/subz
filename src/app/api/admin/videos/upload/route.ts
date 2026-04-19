import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminAuth } from "@/lib/utils/adminAuth";
import { randomUUID } from "crypto";

const uploadSchema = z.object({
  title: z.string().min(1).max(200),
  subtitle_start_ms: z.number().int().min(0),
  subtitle_end_ms: z.number().int().min(1),
  duration_ms: z.number().int().min(1),
});

export async function POST(req: NextRequest) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "Missing video file" }, { status: 400 });
  }

  const parsed = uploadSchema.safeParse({
    title: formData.get("title"),
    subtitle_start_ms: parseInt(formData.get("subtitle_start_ms") as string),
    subtitle_end_ms: parseInt(formData.get("subtitle_end_ms") as string),
    duration_ms: parseInt(formData.get("duration_ms") as string),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid fields" }, { status: 400 });
  }

  const { title, subtitle_start_ms: subtitleStartMs, subtitle_end_ms: subtitleEndMs, duration_ms: durationMs } = parsed.data;

  const supabase = createServiceClient();
  const ext = file.name.split(".").pop() ?? "mp4";
  const storagePath = `${randomUUID()}.${ext}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("videos")
    .upload(storagePath, file, {
      contentType: file.type || "video/mp4",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from("videos").getPublicUrl(storagePath);

  // Insert video row
  const { data: video, error: dbError } = await supabase
    .from("videos")
    .insert({
      title,
      storage_path: storagePath,
      public_url: urlData.publicUrl,
      duration_ms: durationMs,
      subtitle_start_ms: subtitleStartMs,
      subtitle_end_ms: subtitleEndMs,
    })
    .select()
    .single();

  if (dbError) {
    // Clean up storage on DB failure
    await supabase.storage.from("videos").remove([storagePath]);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json(video, { status: 201 });
}
