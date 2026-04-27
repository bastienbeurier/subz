"use client";

import { useEffect, useRef, useState } from "react";
import type { Video, VideoSubtitle } from "@/types/game";
import { getVolume } from "@/lib/volume";

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
  const [mutedFallback, setMutedFallback] = useState(false);
  const playsRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.volume = getVolume();
    const handler = (e: Event) => { el.volume = (e as CustomEvent<number>).detail; };
    window.addEventListener("gamevolume", handler);
    return () => window.removeEventListener("gamevolume", handler);
  }, []);

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
    setMutedFallback(false);
    if (autoPlay) {
      el.muted = false;
      el.play().catch(() => {
        // Autoplay with sound blocked — play muted immediately so video is in sync,
        // then show non-blocking unmute button.
        el.muted = true;
        el.play().catch(() => {});
        setMutedFallback(true);
      });
    }
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
    <div className="relative w-full max-h-full bg-black overflow-hidden" style={{ aspectRatio: "16/9" }}>
      <video
        ref={videoRef}
        src={video.public_url}
        className="absolute inset-0 w-full h-full object-contain"
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />
      {mutedFallback && (
        <button
          className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white text-sm font-semibold px-3 py-1.5 rounded-full"
          onClick={() => {
            const el = videoRef.current;
            if (!el) return;
            el.muted = false;
            setMutedFallback(false);
          }}
        >
          🔇 <span>Tap for sound</span>
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
            className="game-subtitle"
            style={{ color: subtitleText === null ? "#facc15" : "#fff" }}
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
