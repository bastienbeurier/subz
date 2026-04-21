"use client";

import { useGameStore } from "@/store/gameStore";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import type { Video } from "@/types/game";

interface PromptPhaseProps {
  video: Video;
}

export function PromptPhase({ video }: PromptPhaseProps) {
  const room = useGameStore((s) => s.room);

  const handleComplete = async () => {
    if (!room) return;
    await fetch("/api/game/advance-phase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: room.id, expectedPhase: "prompt" }),
    });
  };

  return (
    <main className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 flex flex-col justify-center">
        <VideoPlayer
          video={video}
          subtitleText={null}
          playCount={2}
          onComplete={handleComplete}
          autoPlay
          staticSubtitles={video.subtitles}
        />
      </div>
      <div className="p-4 text-center">
        <p className="text-white/40 text-sm">Watch carefully — then fill in the missing subtitle</p>
      </div>
    </main>
  );
}
