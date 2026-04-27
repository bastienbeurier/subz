"use client";

import { useCallback, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { CountdownOverlay } from "@/components/video/CountdownOverlay";
import { useTimer } from "@/hooks/useTimer";
import type { Video } from "@/types/game";

interface PromptPhaseProps {
  video: Video;
}

export function PromptPhase({ video }: PromptPhaseProps) {
  const room = useGameStore((s) => s.room);
  const [countingDown, setCountingDown] = useState(true);

  const handleAdvance = async () => {
    if (!room) return;
    await fetch("/api/game/advance-phase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: room.id, expectedPhase: "prompt" }),
    });
  };

  useTimer({ deadline: room?.auto_advance_at ?? null, onExpire: handleAdvance });

  const handleCountdownComplete = useCallback(() => setCountingDown(false), []);

  return (
    <main className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 min-h-0 flex flex-col justify-center overflow-hidden">
        {countingDown ? (
          <CountdownOverlay onComplete={handleCountdownComplete} />
        ) : (
          <VideoPlayer
            video={video}
            subtitleText={null}
            playCount={2}
            onComplete={handleAdvance}
            autoPlay
            staticSubtitles={video.subtitles}
          />
        )}
      </div>
      <div className="p-4 text-center">
        <p className="text-white/80 text-sm font-medium tracking-wide">
          Watch carefully — then fill in the missing subtitle
        </p>
        <p className="text-white/40 text-xs mt-1">The video plays twice</p>
      </div>
    </main>
  );
}
