"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TimecodeCapture } from "@/components/admin/TimecodeCapture";
import type { Video, VideoSubtitle } from "@/types/game";

export default function VideoEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [video, setVideo] = useState<Video | null>(null);
  const [subtitles, setSubtitles] = useState<VideoSubtitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setError] = useState<string | null>(null);

  // Editable meta fields
  const [title, setTitle] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [startMs, setStartMs] = useState(0);
  const [endMs, setEndMs] = useState(0);

  // Current video position (shared from the top TimecodeCapture)
  const [videoCurrentMs, setVideoCurrentMs] = useState(0);

  // New subtitle form
  const [newSubStart, setNewSubStart] = useState("");
  const [newSubEnd, setNewSubEnd] = useState("");
  const [newSubText, setNewSubText] = useState("");
  const [subError, setSubError] = useState<string | null>(null);
  const [addingSubtitle, setAddingSubtitle] = useState(false);

  // Edit subtitle inline
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editSubStart, setEditSubStart] = useState("");
  const [editSubEnd, setEditSubEnd] = useState("");
  const [editSubText, setEditSubText] = useState("");

  const fetchData = async () => {
    const [videoRes, subsRes] = await Promise.all([
      fetch("/api/admin/videos"),
      fetch(`/api/admin/video-subtitles?video_id=${id}`),
    ]);
    if (videoRes.ok) {
      const videos: Video[] = await videoRes.json();
      const v = videos.find((v) => v.id === id);
      if (v) {
        setVideo(v);
        setTitle(v.title);
        setIsActive(v.is_active);
        setStartMs(v.subtitle_start_ms);
        setEndMs(v.subtitle_end_ms);
      }
    }
    if (subsRes.ok) {
      setSubtitles(await subsRes.json());
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleSaveMeta = async () => {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/videos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, title, is_active: isActive, subtitle_start_ms: startMs, subtitle_end_ms: endMs }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Save failed");
    }
    setSaving(false);
  };

  const handleTimecodes = (newStartMs: number, newEndMs: number) => {
    setStartMs(newStartMs);
    setEndMs(newEndMs);
  };

  const handleAddSubtitle = async () => {
    setSubError(null);
    const start = Math.round(parseFloat(newSubStart) * 1000);
    const end = Math.round(parseFloat(newSubEnd) * 1000);
    if (!newSubText.trim()) { setSubError("Text is required"); return; }
    if (isNaN(start) || isNaN(end)) { setSubError("Start and end must be numbers"); return; }
    if (end <= start) { setSubError("End must be greater than start"); return; }
    setAddingSubtitle(true);
    try {
      const res = await fetch("/api/admin/video-subtitles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_id: id, start_ms: start, end_ms: end, text: newSubText.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setSubError(d.error ?? `Error ${res.status}`);
      } else {
        setNewSubStart("");
        setNewSubEnd("");
        setNewSubText("");
        await fetchData();
      }
    } catch {
      setSubError("Network error");
    } finally {
      setAddingSubtitle(false);
    }
  };

  const handleStartEdit = (sub: VideoSubtitle) => {
    setEditingSubId(sub.id);
    setEditSubStart(String(sub.start_ms / 1000));
    setEditSubEnd(String(sub.end_ms / 1000));
    setEditSubText(sub.text);
  };

  const handleSaveSubtitle = async (subId: string) => {
    const start = Math.round(parseFloat(editSubStart) * 1000);
    const end = Math.round(parseFloat(editSubEnd) * 1000);
    if (!editSubText || isNaN(start) || isNaN(end) || end <= start) return;
    const res = await fetch("/api/admin/video-subtitles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: subId, start_ms: start, end_ms: end, text: editSubText }),
    });
    if (res.ok) {
      setEditingSubId(null);
      await fetchData();
    }
  };

  const handleDeleteSubtitle = async (subId: string) => {
    if (!confirm("Delete this subtitle?")) return;
    await fetch("/api/admin/video-subtitles", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: subId }),
    });
    await fetchData();
  };

  const fmt = (ms: number) => `${(ms / 1000).toFixed(2)}s`;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!video) {
    return <p className="text-white/40 text-center py-20">Video not found.</p>;
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin")}>
          ← Back
        </Button>
        <h1 className="text-xl font-black text-white">Edit video</h1>
      </div>

      <Input id="title" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />

      {/* Video player + timecode capture */}
      <TimecodeCapture
        videoUrl={video.public_url}
        initialStartMs={startMs}
        startOnly
        staticSubtitles={subtitles}
        onTimeUpdate={setVideoCurrentMs}
        onCapture={(s, e) => handleTimecodes(s, e)}
      />

      {/* Active toggle + save */}
      <div className="flex items-center justify-between gap-4">
        <label className="flex items-center gap-3 cursor-pointer" onClick={() => setIsActive(!isActive)}>
          <div className={`w-10 h-6 rounded-full transition-colors ${isActive ? "bg-violet-600" : "bg-white/20"} relative`}>
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${isActive ? "translate-x-5" : "translate-x-1"}`} />
          </div>
          <span className="text-white/70 text-sm">Active</span>
        </label>
        <Button onClick={handleSaveMeta} loading={saving} size="sm">
          Save changes
        </Button>
      </div>
      {saveError && <p className="text-red-400 text-sm">{saveError}</p>}

      {/* Static subtitles */}
      <div className="space-y-3 pt-2 border-t border-white/10">
        <p className="text-white/60 text-sm font-semibold">Static subtitles</p>

        {subtitles.length > 0 && (
          <div className="flex flex-col gap-2">
            {subtitles.map((sub) => (
              <div key={sub.id} className="p-3 rounded-xl bg-white/5 border border-white/10">
                {editingSubId === sub.id ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <Input id={`es-${sub.id}`} label="Start (s)" value={editSubStart} onChange={(e) => setEditSubStart(e.target.value)} />
                        <button className="text-xs text-violet-400 hover:text-violet-300 text-left" onClick={() => setEditSubStart(String(videoCurrentMs / 1000))}>
                          Set from video
                        </button>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Input id={`ee-${sub.id}`} label="End (s)" value={editSubEnd} onChange={(e) => setEditSubEnd(e.target.value)} />
                        <button className="text-xs text-violet-400 hover:text-violet-300 text-left" onClick={() => setEditSubEnd(String(videoCurrentMs / 1000))}>
                          Set from video
                        </button>
                      </div>
                    </div>
                    <Input id={`et-${sub.id}`} label="Text" value={editSubText} onChange={(e) => setEditSubText(e.target.value)} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSaveSubtitle(sub.id)}>Save</Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingSubId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{sub.text}</p>
                      <p className="text-white/40 text-xs font-mono">{fmt(sub.start_ms)} → {fmt(sub.end_ms)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => handleStartEdit(sub)}>Edit</Button>
                      <Button variant="danger" size="sm" onClick={() => handleDeleteSubtitle(sub.id)}>Delete</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <Input id="ns-start" label="Start (s)" value={newSubStart} onChange={(e) => setNewSubStart(e.target.value)} placeholder="e.g. 3.5" />
              <button className="text-xs text-violet-400 hover:text-violet-300 text-left" onClick={() => setNewSubStart(String(videoCurrentMs / 1000))}>
                Set from video
              </button>
            </div>
            <div className="flex flex-col gap-1">
              <Input id="ns-end" label="End (s)" value={newSubEnd} onChange={(e) => setNewSubEnd(e.target.value)} placeholder="e.g. 7" />
              <button className="text-xs text-violet-400 hover:text-violet-300 text-left" onClick={() => setNewSubEnd(String(videoCurrentMs / 1000))}>
                Set from video
              </button>
            </div>
          </div>
          <Input id="ns-text" label="Text" value={newSubText} onChange={(e) => setNewSubText(e.target.value)} placeholder="Subtitle text…" />
          {subError && <p className="text-red-400 text-xs">{subError}</p>}
          <Button variant="secondary" size="sm" onClick={handleAddSubtitle} loading={addingSubtitle}>
            Add subtitle
          </Button>
        </div>
      </div>
    </div>
  );
}
