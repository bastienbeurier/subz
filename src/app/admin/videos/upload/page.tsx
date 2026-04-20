"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TimecodeCapture } from "@/components/admin/TimecodeCapture";

interface DraftSubtitle {
  id: string; // local-only id for list key
  start_ms: number;
  end_ms: number;
  text: string;
}

type Step = "file" | "timecodes" | "done";

export default function VideoUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("file");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [timecodes, setTimecodes] = useState<{ startMs: number; endMs: number; durationMs: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Static subtitles drafted before upload
  const [subtitles, setSubtitles] = useState<DraftSubtitle[]>([]);
  const [newSubStart, setNewSubStart] = useState("");
  const [newSubEnd, setNewSubEnd] = useState("");
  const [newSubText, setNewSubText] = useState("");
  const [subError, setSubError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setTitle(f.name.replace(/\.[^/.]+$/, ""));
    setPreviewUrl(URL.createObjectURL(f));
    setStep("timecodes");
  };

  const handleTimecodes = (startMs: number, endMs: number, durationMs: number) => {
    setTimecodes({ startMs, endMs, durationMs });
  };

  const handleAddSubtitle = () => {
    setSubError(null);
    const startMs = Math.round(parseFloat(newSubStart) * 1000);
    const endMs = Math.round(parseFloat(newSubEnd) * 1000);
    if (!newSubText.trim()) { setSubError("Text is required"); return; }
    if (isNaN(startMs) || isNaN(endMs)) { setSubError("Start and end must be numbers"); return; }
    if (endMs <= startMs) { setSubError("End must be greater than start"); return; }
    setSubtitles((prev) => [
      ...prev,
      { id: crypto.randomUUID(), start_ms: startMs, end_ms: endMs, text: newSubText.trim() },
    ]);
    setNewSubStart("");
    setNewSubEnd("");
    setNewSubText("");
  };

  const handleRemoveSubtitle = (id: string) => {
    setSubtitles((prev) => prev.filter((s) => s.id !== id));
  };

  const handleUpload = async () => {
    if (!file || !title || !timecodes) return;
    setUploading(true);
    setError(null);

    try {
      setUploadProgress("Preparing upload…");
      const prepRes = await fetch("/api/admin/videos/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          title,
          subtitle_start_ms: timecodes.startMs,
          subtitle_end_ms: timecodes.endMs,
          duration_ms: timecodes.durationMs,
        }),
      });

      if (!prepRes.ok) {
        const d = await prepRes.json();
        throw new Error(d.error ?? "Failed to prepare upload");
      }

      const { signedUrl, storagePath, ...metadata } = await prepRes.json();

      setUploadProgress("Uploading video…");
      const putRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "video/mp4" },
        body: file,
      });

      if (!putRes.ok) {
        throw new Error(`Storage upload failed (${putRes.status})`);
      }

      setUploadProgress("Saving…");
      const regRes = await fetch("/api/admin/videos/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storagePath, ...metadata }),
      });

      if (!regRes.ok) {
        const d = await regRes.json();
        throw new Error(d.error ?? "Failed to register video");
      }

      const { id: videoId } = await regRes.json();

      // Save static subtitles
      if (subtitles.length > 0) {
        setUploadProgress("Saving subtitles…");
        await Promise.all(
          subtitles.map((s) =>
            fetch("/api/admin/video-subtitles", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                video_id: videoId,
                start_ms: s.start_ms,
                end_ms: s.end_ms,
                text: s.text,
              }),
            })
          )
        );
      }

      setStep("done");
      setTimeout(() => router.push("/admin"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const fmt = (ms: number) => `${(ms / 1000).toFixed(2)}s`;

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin")}>
          ← Back
        </Button>
        <h1 className="text-xl font-black text-white">Upload video</h1>
      </div>

      {step === "file" && (
        <div
          className="border-2 border-dashed border-white/20 rounded-2xl p-12 flex flex-col items-center gap-4 cursor-pointer hover:border-violet-500/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <p className="text-white/40 text-center">Click to select a video file</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {step === "timecodes" && previewUrl && (
        <div className="space-y-6">
          <Input
            id="title"
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          {/* Video preview with timecode + static subtitle preview */}
          <TimecodeCapture
            videoUrl={previewUrl}
            onCapture={handleTimecodes}
            startOnly
            staticSubtitles={subtitles}
          />

          {timecodes && (
            <p className="text-green-400 text-sm">
              Subtitle starts at {fmt(timecodes.startMs)} (runs to end of video)
            </p>
          )}

          {/* Static subtitles */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            <p className="text-white/60 text-sm font-semibold">Static subtitles</p>
            <p className="text-white/30 text-xs">
              Always-shown subtitles at specific times. Enter times in milliseconds.
            </p>

            {subtitles.length > 0 && (
              <div className="flex flex-col gap-2">
                {subtitles.map((sub) => (
                  <div key={sub.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{sub.text}</p>
                      <p className="text-white/40 text-xs font-mono">
                        {fmt(sub.start_ms)} → {fmt(sub.end_ms)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveSubtitle(sub.id)}
                      className="text-red-400/60 hover:text-red-400 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  id="sub-start"
                  label="Start (s)"
                  value={newSubStart}
                  onChange={(e) => setNewSubStart(e.target.value)}
                  placeholder="e.g. 3.5"
                />
                <Input
                  id="sub-end"
                  label="End (s)"
                  value={newSubEnd}
                  onChange={(e) => setNewSubEnd(e.target.value)}
                  placeholder="e.g. 7"
                />
              </div>
              <Input
                id="sub-text"
                label="Text"
                value={newSubText}
                onChange={(e) => setNewSubText(e.target.value)}
                placeholder="Subtitle text…"
              />
              {subError && <p className="text-red-400 text-xs">{subError}</p>}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddSubtitle}
              >
                Add subtitle
              </Button>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button
            className="w-full"
            onClick={handleUpload}
            loading={uploading}
            disabled={!title || !timecodes}
          >
            {uploading ? (uploadProgress ?? "Uploading…") : "Upload video"}
          </Button>
        </div>
      )}

      {step === "done" && (
        <div className="text-center py-12 text-green-400 font-bold text-lg">
          Uploaded! Redirecting…
        </div>
      )}
    </div>
  );
}
