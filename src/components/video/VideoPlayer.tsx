"use client";

import { useEffect, useRef, useState } from "react";
import { SubtitleOverlay } from "./SubtitleOverlay";
import type { Video } from "@/types/game";

interface VideoPlayerProps {
  video: Video;
  // If provided, show the subtitle text; if null show placeholder; if undefined hide entirely
  subtitleText?: string | null;
  // How many times to play before firing onComplete (default 1)
  playCount?: number;
  onComplete?: () => void;
  autoPlay?: boolean;
}

export function VideoPlayer({
  video,
  subtitleText,
  playCount = 1,
  onComplete,
  autoPlay = true,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const playsRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const showSubtitle =
    subtitleText !== undefined &&
    currentTimeMs >= video.subtitle_start_ms &&
    currentTimeMs <= video.subtitle_end_ms;

  useEffect(() => {
    playsRef.current = 0;
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = 0;
    if (autoPlay) el.play().catch(() => {});
  }, [video.id, autoPlay]);

  const handleTimeUpdate = () => {
    const el = videoRef.current;
    if (el) setCurrentTimeMs(el.currentTime * 1000);
  };

  const handleEnded = () => {
    playsRef.current += 1;
    if (playsRef.current < playCount) {
      const el = videoRef.current;
      if (el) {
        el.currentTime = 0;
        el.play().catch(() => {});
      }
    } else {
      onCompleteRef.current?.();
    }
  };

  return (
    <div className="relative w-full bg-black" style={{ aspectRatio: "16/9" }}>
      <video
        ref={videoRef}
        src={video.public_url}
        className="w-full h-full object-cover"
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />
      <SubtitleOverlay
        text={subtitleText ?? null}
        isVisible={showSubtitle}
        isPlaceholder={subtitleText === null}
      />
    </div>
  );
}
