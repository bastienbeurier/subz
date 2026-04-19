"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useGameStore } from "@/store/gameStore";
import { usePlayerSession } from "@/hooks/usePlayerSession";
import { LobbyPhase } from "@/components/game/LobbyPhase";
import { PromptPhase } from "@/components/game/PromptPhase";
import { AnsweringPhase } from "@/components/game/AnsweringPhase";
import { DiffusionPhase } from "@/components/game/DiffusionPhase";
import { VotingPhase } from "@/components/game/VotingPhase";
import { RoundResultsPhase } from "@/components/game/RoundResultsPhase";
import JoinScreen from "@/components/game/JoinScreen";
import { createClient } from "@/lib/supabase/client";
import type { Video } from "@/types/game";
import { useState } from "react";

export default function RoomPage() {
  const params = useParams();
  const code = (params.code as string).toUpperCase();
  const session = usePlayerSession();
  const room = useGameStore((s) => s.room);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const setSubmitted = useGameStore((s) => s.setSubmitted);
  const setVoted = useGameStore((s) => s.setVoted);
  const [video, setVideo] = useState<Video | null>(null);

  // Reset per-round local flags when phase changes
  useEffect(() => {
    if (room?.phase === "answering") setSubmitted(false);
    if (room?.phase === "voting") setVoted(false);
  }, [room?.phase, setSubmitted, setVoted]);

  // Load video when current_video_id changes
  useEffect(() => {
    if (!room?.current_video_id) {
      setVideo(null);
      return;
    }
    const supabase = createClient();
    supabase
      .from("videos")
      .select()
      .eq("id", room.current_video_id)
      .single()
      .then(({ data }) => {
        if (data) setVideo(data as Video);
      });
  }, [room?.current_video_id]);

  // No session → show inline join screen
  if (!session || !myPlayerId) {
    return <JoinScreen roomCode={code} />;
  }

  // Room not yet loaded
  if (!room) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  switch (room.phase) {
    case "lobby":
      return <LobbyPhase />;

    case "prompt":
      if (!video) return <Spinner />;
      return <PromptPhase video={video} />;

    case "answering":
      return <AnsweringPhase />;

    case "diffusion":
      if (!video) return <Spinner />;
      return <DiffusionPhase video={video} />;

    case "voting":
      return <VotingPhase />;

    case "round_results":
      return <RoundResultsPhase />;

    case "final":
      // FinalPhase will be added in Phase 4
      return (
        <div className="flex-1 flex items-center justify-center text-white/40">
          Game over — final phase coming soon
        </div>
      );

    default:
      return (
        <div className="flex-1 flex items-center justify-center text-white/40">
          Unknown phase: {room.phase}
        </div>
      );
  }
}

function Spinner() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
