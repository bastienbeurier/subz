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
 * Injects all subtitles onto a SINGLE native text track so the browser
 * applies identical positioning to every cue — no React state, no
 * onTimeUpdate race, no cross-track alignment drift.
 *
 * Cues added:
 *  - Static context subtitles (video_subtitles rows) at their timecodes.
 *  - Player answer / placeholder from subtitle_start_ms to end of clip.
 *    The placeholder is wrapped in <c.placeholder> so ::cue(c.placeholder)
 *    can colour it yellow without affecting answer text.
 *
 * The track is disabled on cleanup; key-based remounts give a fresh video
 * element anyway so accumulation is not a concern.
 */
function injectSubtitleTrack(
  el: HTMLVideoElement,
  staticSubtitles: VideoSubtitle[] | undefined,
): () => void {
  try {
    const track = el.addTextTrack("subtitles", "game", "und");
    track.mode = "showing";

    const makeCue = (startSec: number, endSec: number, text: string) => {
      const cue = new VTTCue(startSec, endSec, text);
      cue.snapToLines = false;
      cue.line = 82;
      cue.position = 50;
      cue.size = 92;
      cue.align = "center";
      return cue;
    };

    for (const s of staticSubtitles ?? []) {
      track.addCue(makeCue(s.start_ms / 1000, s.end_ms / 1000, s.text));
    }

    return () => { track.mode = "disabled"; };
  } catch {
    return () => {};
  }
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
    return injectSubtitleTrack(el, staticSubtitles);
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

  const showPlayerSub = subtitleText !== undefined && currentTimeMs >= video.subtitle_start_ms;

  return (
    <div className="relative w-full bg-black overflow-hidden" style={{ aspectRatio: "16/9" }}>
      <video
        ref={videoRef}
        src={video.public_url}
        className="absolute inset-0 w-full h-full object-contain"
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
      {showPlayerSub && (
        <div
          className="absolute left-0 right-0 flex justify-center pointer-events-none"
          style={{ top: "82%" }}
        >
          <span
            style={{
              display: "inline-block",
              backgroundColor: "rgba(0,0,0,0.82)",
              color: subtitleText === null ? "#facc15" : "#fff",
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontSize: "1.35rem",
              fontWeight: 700,
              lineHeight: 1.3,
              textShadow: "0 1px 6px rgba(0,0,0,1)",
              padding: "0.1em 0.4em",
              textAlign: "center",
              maxWidth: "92%",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {subtitleText === null ? "INSERT SUBTITLE HERE" : subtitleText}
          </span>
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
