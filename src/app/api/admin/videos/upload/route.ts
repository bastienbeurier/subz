import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const title = formData.get("title") as string | null;
  const subtitleStartMs = parseInt(formData.get("subtitle_start_ms") as string);
  const subtitleEndMs = parseInt(formData.get("subtitle_end_ms") as string);
  const durationMs = parseInt(formData.get("duration_ms") as string);

  if (!file || !title || isNaN(subtitleStartMs) || isNaN(subtitleEndMs) || isNaN(durationMs)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

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
