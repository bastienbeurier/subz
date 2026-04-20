import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminAuth } from "@/lib/utils/adminAuth";

// Step 2 of 2 in the upload flow.
// Called after the browser has successfully PUT the file to the signed URL.
// Inserts the videos row using the storage_path returned by the upload route.

const schema = z.object({
  storagePath: z.string().min(1),
  title: z.string().min(1).max(200),
  subtitle_start_ms: z.number().int().min(0),
  subtitle_end_ms: z.number().int().min(1),
  duration_ms: z.number().int().min(1),
});

export async function POST(req: NextRequest) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid fields" }, { status: 400 });
  }

  const { storagePath, title, subtitle_start_ms, subtitle_end_ms, duration_ms } = parsed.data;
  const supabase = createServiceClient();

  const { data: urlData } = supabase.storage.from("videos").getPublicUrl(storagePath);

  const { data: video, error: dbError } = await supabase
    .from("videos")
    .insert({
      title,
      storage_path: storagePath,
      public_url: urlData.publicUrl,
      duration_ms,
      subtitle_start_ms,
      subtitle_end_ms,
    })
    .select()
    .single();

  if (dbError) {
    // Remove the orphaned file if DB insert fails
    await supabase.storage.from("videos").remove([storagePath]);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json(video, { status: 201 });
}
