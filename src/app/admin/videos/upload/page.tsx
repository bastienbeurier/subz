"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TimecodeCapture } from "@/components/admin/TimecodeCapture";

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

  const handleUpload = async () => {
    if (!file || !title || !timecodes) return;
    setUploading(true);
    setError(null);

    try {
      // Step 1: get a signed upload URL from Vercel (metadata only, no file)
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

      // Step 2: PUT the file directly to Supabase Storage (bypasses Vercel)
      setUploadProgress("Uploading video…");
      const putRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "video/mp4" },
        body: file,
      });

      if (!putRes.ok) {
        throw new Error(`Storage upload failed (${putRes.status})`);
      }

      // Step 3: register the video row in the DB
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

      setStep("done");
      setTimeout(() => router.push("/admin"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

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
          <p className="text-white/40 text-center">
            Click to select a video file
          </p>
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
        <div className="space-y-4">
          <Input
            id="title"
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <TimecodeCapture
            videoUrl={previewUrl}
            onCapture={handleTimecodes}
          />
          {timecodes && (
            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
              Timecodes set: {(timecodes.startMs / 1000).toFixed(2)}s → {(timecodes.endMs / 1000).toFixed(2)}s
            </div>
          )}
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
