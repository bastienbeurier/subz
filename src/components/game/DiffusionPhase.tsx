"use client";

import { useGameStore, selectCurrentAnswers } from "@/store/gameStore";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import type { Video } from "@/types/game";

interface DiffusionPhaseProps {
  video: Video;
}

export function DiffusionPhase({ video }: DiffusionPhaseProps) {
  const room = useGameStore((s) => s.room);
  const answers = useGameStore(selectCurrentAnswers);

  const currentAnswer = answers[room?.diffusion_index ?? 0];

  const handleComplete = async () => {
    if (!room) return;
    await fetch("/api/game/next-diffusion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: room.id,
        currentIndex: room.diffusion_index,
      }),
    });
  };

  if (!currentAnswer) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="flex flex-col min-h-screen">
      <div className="p-4 text-center">
        <p className="text-white/40 text-xs uppercase tracking-widest">
          Subtitle {(room?.diffusion_index ?? 0) + 1} of {answers.length}
        </p>
      </div>
      <div className="flex-1 flex flex-col justify-center">
        <VideoPlayer
          video={video}
          subtitleText={currentAnswer.text}
          playCount={1}
          onComplete={handleComplete}
          autoPlay
        />
      </div>
    </main>
  );
}
