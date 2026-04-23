"use client";

import { useEffect, useRef, useState } from "react";
import type { Video, VideoSubtitle } from "@/types/game";

interface VideoPlayerProps {
  video: Video;
  // If provided, show the subtitle text at subtitle_start_ms; if null show
  // placeholder; if undefined hide entirely.
  subtitleText?: string | null;
  // How many times to play before firing onComplete (default 1)
  playCount?: number;
  onComplete?: () => void;
  autoPlay?: boolean;
  staticSubtitles?: VideoSubtitle[];
}

/**
 * Injects subtitles as native browser text-track cues so they are tied
 * directly to the video timeline — no React state, no onTimeUpdate race.
 *
 * Two tracks are created per mount:
 *   1. Static context subtitles (video_subtitles rows) – shown at their
 *      configured timecodes, positioned near the bottom of the frame.
 *   2. The player's answer / placeholder – shown from subtitle_start_ms to
 *      the end of the clip, positioned above the static line so both are
 *      readable simultaneously.
 *
 * Both tracks are set to 'disabled' on cleanup so they don't linger if the
 * video element is reused (though key-based remounts already give a fresh
 * element each time).
 */
function injectSubtitleTracks(
  el: HTMLVideoElement,
  staticSubtitles: VideoSubtitle[] | undefined,
  subtitleText: string | null | undefined,
  subtitleStartMs: number,
  durationMs: number
): () => void {
  const tracks: TextTrack[] = [];

  // Track 1: static context subtitles
  if (staticSubtitles?.length) {
    try {
      const t = el.addTextTrack("subtitles", "context", "und");
      t.mode = "showing";
      for (const s of staticSubtitles) {
        const cue = new VTTCue(s.start_ms / 1000, s.end_ms / 1000, s.text);
        // Position at the very bottom of the frame
        cue.snapToLines = false;
        cue.line = 93;
        cue.position = 50;
        cue.size = 90;
        cue.align = "center";
        t.addCue(cue);
      }
      tracks.push(t);
    } catch {
      // VTTCue not supported — subtitles simply won't show on this browser
    }
  }

  // Track 2: player answer / placeholder
  if (subtitleText !== undefined) {
    try {
      const label = subtitleText === null ? "insert subtitle here" : subtitleText;
      const startSec = subtitleStartMs / 1000;
      const endSec = Math.max(durationMs / 1000, startSec + 0.1);
      const t = el.addTextTrack("subtitles", "answer", "und");
      t.mode = "showing";
      const cue = new VTTCue(startSec, endSec, label);
      // Position ~12 % above the bottom so it sits above the static line
      cue.snapToLines = false;
      cue.line = 80;
      cue.position = 50;
      cue.size = 90;
      cue.align = "center";
      t.addCue(cue);
      tracks.push(t);
    } catch {
      // ignore
    }
  }

  return () => {
    for (const t of tracks) t.mode = "disabled";
  };
}

export function VideoPlayer({
  video,
  subtitleText,
  playCount = 1,
  onComplete,
  autoPlay = true,
  staticSubtitles,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [currentPlay, setCurrentPlay] = useState(1);
  const [needsTap, setNeedsTap] = useState(false);
  const playsRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Inject native subtitle tracks once the video element is ready.
  // Runs again if the video changes; component remounts (via key) also
  // give a fresh element so cleanup is automatic.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    return injectSubtitleTracks(
      el,
      staticSubtitles,
      subtitleText,
      video.subtitle_start_ms,
      video.duration_ms
    );
    // subtitleText and staticSubtitles are stable per video.id for a given mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.id]);

  useEffect(() => {
    playsRef.current = 0;
    setCurrentPlay(1);
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = 0;
    setCurrentTimeMs(0);
    setNeedsTap(false);
    if (autoPlay) el.play().catch(() => { setNeedsTap(true); });
  }, [video.id, autoPlay]);

  const handleTimeUpdate = () => {
    const el = videoRef.current;
    if (el) setCurrentTimeMs(el.currentTime * 1000);
  };

  const handleEnded = () => {
    playsRef.current += 1;
    if (playsRef.current < playCount) {
      setCurrentPlay(playsRef.current + 1);
      const el = videoRef.current;
      if (el) {
        el.currentTime = 0;
        el.play().catch(() => {});
      }
    } else {
      onCompleteRef.current?.();
    }
  };

  const progressPct = video.duration_ms > 0 ? (currentTimeMs / video.duration_ms) * 100 : 0;

  return (
    <div className="relative w-full bg-black" style={{ aspectRatio: "16/9" }}>
      <video
        ref={videoRef}
        src={video.public_url}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />
      {needsTap && (
        <button
          className="absolute inset-0 flex items-center justify-center bg-black/40"
          onClick={() => {
            videoRef.current?.play().then(() => setNeedsTap(false)).catch(() => {});
          }}
        >
          <div className="flex flex-col items-center gap-2 text-white">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16 drop-shadow-lg">
              <path d="M8 5v14l11-7z" />
            </svg>
            <span className="text-sm font-medium drop-shadow">Tap to play</span>
          </div>
        </button>
      )}
      {playCount > 1 && (
        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white/90 text-xs font-medium px-2.5 py-1 rounded-full pointer-events-none">
          {currentPlay === 1 ? "1st watch" : "2nd watch"}
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 pointer-events-none">
        <div
          className="h-full bg-white/70"
          style={{ width: `${progressPct}%`, transition: "width 0.1s linear" }}
        />
      </div>
    </div>
  );
}
