/**
 * translate-subtitles-es.ts
 *
 * Translates all English video subtitles to Spanish using the Claude API
 * with prompt caching, then inserts the results into Supabase.
 *
 * Usage:
 *   npx tsx scripts/translate-subtitles-es.ts
 *
 * Requires these env vars (reads from .env.local automatically):
 *   ANTHROPIC_API_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_KEY
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

// ── Clients ──────────────────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// ── Types ────────────────────────────────────────────────────────────────────

interface SubtitleRow {
  id: string;
  video_id: string;
  start_ms: number;
  end_ms: number;
  text: string;
}

// ── Translation ───────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a subtitle translator specialising in video game captions.
Your job is to translate English subtitle texts to Spanish.
Rules:
- Keep translations natural and idiomatic, not word-for-word
- Preserve tone (humour, surprise, sarcasm) exactly as in the original
- Keep the same approximate length — subtitles must be readable on screen
- Do NOT add any explanation or commentary
- Return ONLY a valid JSON array of strings, one translated string per input string, in the same order`;

async function translateBatch(texts: string[]): Promise<string[]> {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 4096,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Translate these subtitle texts from English to Spanish.\nReturn a JSON array only.\n\n${JSON.stringify(texts, null, 2)}`,
      },
    ],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text.trim() : "";

  // Strip markdown code fences if present
  const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
  const parsed = JSON.parse(cleaned) as string[];

  if (!Array.isArray(parsed) || parsed.length !== texts.length) {
    throw new Error(
      `Expected ${texts.length} translations, got ${parsed.length}`
    );
  }
  return parsed;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Fetching English subtitles…");

  const { data: allCues, error } = await supabase
    .from("video_subtitles")
    .select("id, video_id, start_ms, end_ms, text")
    .eq("language", "en")
    .order("video_id")
    .order("start_ms");

  if (error || !allCues) {
    console.error("Failed to fetch subtitles:", error?.message);
    process.exit(1);
  }

  console.log(`Found ${allCues.length} English cues across all videos.`);

  // Group by video_id
  const byVideo = new Map<string, SubtitleRow[]>();
  for (const cue of allCues) {
    const list = byVideo.get(cue.video_id) ?? [];
    list.push(cue);
    byVideo.set(cue.video_id, list);
  }

  console.log(`Grouped into ${byVideo.size} videos.\n`);

  let translated = 0;
  let skipped = 0;
  let failed = 0;
  const videoIds = [...byVideo.keys()];

  for (let i = 0; i < videoIds.length; i++) {
    const videoId = videoIds[i];
    const cues = byVideo.get(videoId)!;

    // Check if ES version already exists for this video
    const { count } = await supabase
      .from("video_subtitles")
      .select("id", { count: "exact", head: true })
      .eq("video_id", videoId)
      .eq("language", "es");

    if ((count ?? 0) > 0) {
      console.log(`[${i + 1}/${videoIds.length}] ⏭  ${videoId} — already translated, skipping`);
      skipped++;
      continue;
    }

    try {
      const texts = cues.map((c) => c.text);
      const translations = await translateBatch(texts);

      const inserts = cues.map((cue, idx) => ({
        video_id: cue.video_id,
        start_ms: cue.start_ms,
        end_ms: cue.end_ms,
        text: translations[idx],
        language: "es",
      }));

      const { error: insertError } = await supabase
        .from("video_subtitles")
        .insert(inserts);

      if (insertError) throw new Error(insertError.message);

      console.log(
        `[${i + 1}/${videoIds.length}] ✓  ${videoId} — ${cues.length} cues translated`
      );
      translated++;

      // Small delay to respect rate limits
      await new Promise((r) => setTimeout(r, 300));
    } catch (err) {
      console.error(`[${i + 1}/${videoIds.length}] ✗  ${videoId} — ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`\nDone!`);
  console.log(`  ✓ Translated: ${translated} videos`);
  console.log(`  ⏭  Skipped:    ${skipped} videos (already done)`);
  console.log(`  ✗ Failed:     ${failed} videos`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
