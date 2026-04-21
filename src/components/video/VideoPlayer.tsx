"use client";

import { useEffect, useRef, useState } from "react";
import { SubtitleOverlay } from "./SubtitleOverlay";
import type { Video, VideoSubtitle } from "@/types/game";

interface VideoPlayerProps {
  video: Video;
  // If provided, show the subtitle text; if null show placeholder; if undefined hide entirely
  subtitleText?: string | null;
  // How many times to play before firing onComplete (default 1)
  playCount?: number;
  onComplete?: () => void;
  autoPlay?: boolean;
  staticSubtitles?: VideoSubtitle[];
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

  const isPlaceholder = subtitleText === null;
  // Placeholder obeys the start time (shows the gap window to the player).
  // Real answer text is always visible — it's the content being reviewed.
  const showSubtitle =
    subtitleText !== undefined &&
    (isPlaceholder ? currentTimeMs >= video.subtitle_start_ms : true);

  const activeStaticSubtitle = staticSubtitles?.find(
    (s) => currentTimeMs >= s.start_ms && currentTimeMs <= s.end_ms
  ) ?? null;

  useEffect(() => {
    playsRef.current = 0;
    setCurrentPlay(1);
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = 0;
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
      <SubtitleOverlay
        text={subtitleText ?? null}
        isVisible={showSubtitle}
        isPlaceholder={isPlaceholder}
      />
      {activeStaticSubtitle && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center px-4 pointer-events-none">
          <span
            className="bg-black/80 text-white text-lg md:text-3xl font-semibold px-4 py-1 rounded-lg text-center max-w-[90%]"
            style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
          >
            {activeStaticSubtitle.text}
          </span>
        </div>
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
