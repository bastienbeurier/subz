"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

interface StaticSubtitlePreview {
  start_ms: number;
  end_ms: number;
  text: string;
}

interface TimecodeCaptureProps {
  videoUrl: string;
  initialStartMs?: number;
  initialEndMs?: number;
  /** When true, only the start time is captured; end is set to video duration */
  startOnly?: boolean;
  /** Static subtitles to preview on the video */
  staticSubtitles?: StaticSubtitlePreview[];
  /** Disable global keyboard shortcuts (use when multiple players are on the page) */
  noKeyboardShortcuts?: boolean;
  /** Label for the save button */
  saveLabel?: string;
  /** Called on every time update so parent can read current position */
  onTimeUpdate?: (currentMs: number) => void;
  onCapture: (startMs: number, endMs: number, durationMs: number) => void;
}

export function TimecodeCapture({
  videoUrl,
  initialStartMs = 0,
  initialEndMs = 0,
  startOnly = false,
  staticSubtitles,
  noKeyboardShortcuts = false,
  saveLabel = "Save timecodes",
  onTimeUpdate: onTimeUpdateProp,
  onCapture,
}: TimecodeCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [startMs, setStartMs] = useState(initialStartMs);
  const [endMs, setEndMs] = useState(initialEndMs);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [paused, setPaused] = useState(true);

  const fmt = (ms: number) => {
    const s = ms / 1000;
    return `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, "0")}`;
  };

  const handleTimeUpdate = () => {
    const el = videoRef.current;
    if (!el) return;
    const ms = el.currentTime * 1000;
    setCurrentMs(ms);
    onTimeUpdateProp?.(ms);
  };

  const handleLoadedMetadata = () => {
    const el = videoRef.current;
    if (!el) return;
    setDurationMs(Math.round(el.duration * 1000));
  };

  const handleSetStart = () => {
    const ms = Math.round((videoRef.current?.currentTime ?? 0) * 1000);
    setStartMs(ms);
  };

  const handleSetEnd = () => {
    const ms = Math.round((videoRef.current?.currentTime ?? 0) * 1000);
    setEndMs(ms);
  };

  const handlePlayPause = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = videoRef.current;
    if (!el) return;
    const ms = Number(e.target.value);
    el.currentTime = ms / 1000;
    setCurrentMs(ms);
  };

  const handleSave = () => {
    const dur = Math.round((videoRef.current?.duration ?? 0) * 1000);
    onCapture(startMs, startOnly ? dur : endMs, dur);
  };

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const onPause = () => setPaused(true);
    const onPlay = () => setPaused(false);
    el.addEventListener("pause", onPause);
    el.addEventListener("play", onPlay);

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
    if (!noKeyboardShortcuts) window.addEventListener("keydown", handleKey);
    return () => {
      el.removeEventListener("pause", onPause);
      el.removeEventListener("play", onPlay);
      if (!noKeyboardShortcuts) window.removeEventListener("keydown", handleKey);
    };
  }, [startMs, endMs]);

  // In startOnly mode, the subtitle window runs from startMs to end of video
  const subtitleEnd = startOnly ? durationMs : endMs;
  const showSubtitle = startMs > 0 && currentMs >= startMs && (subtitleEnd === 0 || currentMs <= subtitleEnd);

  const activeStaticSub = staticSubtitles?.find(
    (s) => currentMs >= s.start_ms && currentMs <= s.end_ms
  ) ?? null;

  return (
    <div className="flex flex-col gap-3">
      {/* Video */}
      <div className="relative bg-black rounded-xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
        />
        {showSubtitle && (
          <div className="absolute bottom-[12%] left-0 right-0 flex justify-center">
            <span className="bg-black/70 text-white/50 text-base font-bold px-3 py-1 rounded border-2 border-dashed border-white/30 italic">
              insert subtitle here
            </span>
          </div>
        )}
        {activeStaticSub && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center px-4">
            <span
              className="bg-black/80 text-white text-base font-semibold px-3 py-1 rounded-lg text-center max-w-[90%]"
              style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
            >
              {activeStaticSub.text}
            </span>
          </div>
        )}
      </div>

      {/* Playback controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={handlePlayPause}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors flex-shrink-0"
        >
          {paused ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 ml-0.5">
              <path d="M8 5v14l11-7z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          )}
        </button>
        <input
          type="range"
          min={0}
          max={durationMs || 100}
          value={currentMs}
          onChange={handleScrub}
          className="flex-1 h-1.5 rounded-full accent-violet-500 cursor-pointer"
        />
        <span className="text-white/40 text-xs font-mono flex-shrink-0 w-24 text-right">
          {fmt(currentMs)} / {fmt(durationMs)}
        </span>
      </div>

      {/* Timecode controls */}
      {startOnly ? (
        <div className="flex items-center gap-3">
          <p className="text-white/50 text-xs flex-1">Subtitle starts at <span className="font-mono text-white/70">{fmt(startMs)}</span></p>
          <Button variant="secondary" size="sm" onClick={handleSetStart}>
            Set start [
          </Button>
        </div>
      ) : (
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
      )}

      <Button onClick={handleSave} disabled={startOnly ? !startMs : (!startMs || !endMs)} className="w-full">
        {saveLabel}
      </Button>

      {!noKeyboardShortcuts && (
        <p className="text-white/30 text-xs text-center">
          Space = play/pause · ← → = frame step · [ = set start{startOnly ? "" : " · ] = set end"}
        </p>
      )}
    </div>
  );
}
