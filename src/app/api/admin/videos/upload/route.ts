import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminAuth } from "@/lib/utils/adminAuth";
import { randomUUID } from "crypto";

// Step 1 of 2 in the upload flow.
//
// Vercel serverless functions have a 4.5 MB request body limit, so we cannot
// receive video files through a Vercel route. Instead:
//   1. This route receives only metadata (JSON) and returns a short-lived
//      Supabase Storage signed upload URL.
//   2. The browser PUTs the file directly to that URL (bypassing Vercel).
//   3. POST /api/admin/videos/register inserts the DB row.

const schema = z.object({
  filename: z.string().min(1),
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

  const { filename, title, subtitle_start_ms, subtitle_end_ms, duration_ms } = parsed.data;
  const ext = filename.split(".").pop() ?? "mp4";
  const storagePath = `${randomUUID()}.${ext}`;

  const supabase = createServiceClient();
  const { data, error } = await supabase.storage
    .from("videos")
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to create upload URL" }, { status: 500 });
  }

  return NextResponse.json({
    signedUrl: data.signedUrl,
    storagePath,
    title,
    subtitle_start_ms,
    subtitle_end_ms,
    duration_ms,
  });
}
