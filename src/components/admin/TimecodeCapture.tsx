"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

interface TimecodeCaptureProps {
  videoUrl: string;
  initialStartMs?: number;
  initialEndMs?: number;
  onCapture: (startMs: number, endMs: number, durationMs: number) => void;
}

export function TimecodeCapture({
  videoUrl,
  initialStartMs = 0,
  initialEndMs = 0,
  onCapture,
}: TimecodeCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [startMs, setStartMs] = useState(initialStartMs);
  const [endMs, setEndMs] = useState(initialEndMs);
  const [currentMs, setCurrentMs] = useState(0);
  const [previewing, setPreviewing] = useState(false);

  const fmt = (ms: number) => {
    const s = ms / 1000;
    return `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, "0")}`;
  };

  const handleTimeUpdate = () => {
    const el = videoRef.current;
    if (!el) return;
    const ms = el.currentTime * 1000;
    setCurrentMs(ms);
    // Stop preview at end timecode
    if (previewing && ms >= endMs) {
      el.pause();
      el.currentTime = startMs / 1000;
      setPreviewing(false);
    }
  };

  const handleSetStart = () => {
    const ms = Math.round((videoRef.current?.currentTime ?? 0) * 1000);
    setStartMs(ms);
  };

  const handleSetEnd = () => {
    const ms = Math.round((videoRef.current?.currentTime ?? 0) * 1000);
    setEndMs(ms);
  };

  const handlePreview = () => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = startMs / 1000;
    el.play().catch(() => {});
    setPreviewing(true);
  };

  const handleSave = () => {
    const durationMs = Math.round((videoRef.current?.duration ?? 0) * 1000);
    onCapture(startMs, endMs, durationMs);
  };

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.target !== document.body) return;
      if (e.key === " ") {
        e.preventDefault();
        el.paused ? el.play().catch(() => {}) : el.pause();
      }
      if (e.key === "[") handleSetStart();
      if (e.key === "]") handleSetEnd();
      if (e.key === "ArrowLeft") el.currentTime = Math.max(0, el.currentTime - 1 / 30);
      if (e.key === "ArrowRight") el.currentTime = Math.min(el.duration, el.currentTime + 1 / 30);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [startMs, endMs]);

  const showSubtitle =
    currentMs >= startMs && currentMs <= endMs;

  return (
    <div className="flex flex-col gap-4">
      {/* Video preview */}
      <div className="relative bg-black rounded-xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
        />
        {showSubtitle && (
          <div className="absolute bottom-[12%] left-0 right-0 flex justify-center">
            <span className="bg-black/70 text-white/50 text-base font-bold px-3 py-1 rounded border-2 border-dashed border-white/30 tracking-widest">
              _ _ _ _ _
            </span>
          </div>
        )}
      </div>

      {/* Current time */}
      <p className="text-white/40 text-sm text-center font-mono">{fmt(currentMs)}</p>

      {/* Timecode controls */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-white/50 text-xs uppercase tracking-wider">Start [ {fmt(startMs)}</p>
          <Button variant="secondary" size="sm" onClick={handleSetStart}>
            Set start [
          </Button>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-white/50 text-xs uppercase tracking-wider">End ] {fmt(endMs)}</p>
          <Button variant="secondary" size="sm" onClick={handleSetEnd}>
            Set end ]
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="ghost" onClick={handlePreview} disabled={!startMs || !endMs}>
          Preview
        </Button>
        <Button onClick={handleSave} disabled={!startMs || !endMs}>
          Save timecodes
        </Button>
      </div>

      <p className="text-white/30 text-xs text-center">
        Space = play/pause · ← → = frame step · [ = set start · ] = set end
      </p>
    </div>
  );
}
