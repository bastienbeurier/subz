"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useGameStore } from "@/store/gameStore";
import { usePlayerSession } from "@/hooks/usePlayerSession";
import { PhaseTransition } from "@/components/layout/PhaseTransition";
import { LobbyPhase } from "@/components/game/LobbyPhase";
import { PromptPhase } from "@/components/game/PromptPhase";
import { AnsweringPhase } from "@/components/game/AnsweringPhase";
import { DiffusionPhase } from "@/components/game/DiffusionPhase";
import { VotingPhase } from "@/components/game/VotingPhase";
import { RoundResultsPhase } from "@/components/game/RoundResultsPhase";
import { FinalPhase } from "@/components/game/FinalPhase";
import JoinScreen from "@/components/game/JoinScreen";
import { ChatPanel } from "@/components/game/ChatPanel";
import { createClient } from "@/lib/supabase/client";
import type { Video } from "@/types/game";

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
      .select("*, video_subtitles(*)")
      .eq("id", room.current_video_id)
      .single()
      .then(({ data }) => {
        if (data) {
          const { video_subtitles, ...rest } = data as Record<string, unknown> & { video_subtitles: Video["subtitles"] };
          setVideo({ ...(rest as object), subtitles: video_subtitles ?? [] } as Video);
        }
      });
  }, [room?.current_video_id]);

  // No session → show inline join screen (no PhaseTransition, standalone screen)
  if (!session || !myPlayerId) {
    return <JoinScreen roomCode={code} />;
  }

  // Room not yet loaded
  if (!room) {
    return <Spinner />;
  }

  // Key for AnimatePresence — use round+phase so transitions fire on every round
  const transitionKey = `${room.current_round}-${room.phase}`;

  const renderPhase = () => {
    switch (room.phase) {
      case "lobby":
        return <LobbyPhase />;
      case "prompt":
        return video ? <PromptPhase video={video} /> : <Spinner />;
      case "answering":
        return <AnsweringPhase />;
      case "diffusion":
        return video ? <DiffusionPhase video={video} /> : <Spinner />;
      case "voting":
        return <VotingPhase />;
      case "round_results":
        return <RoundResultsPhase />;
      case "final":
        return <FinalPhase />;
      default:
        return (
          <div className="flex-1 flex items-center justify-center text-white/40">
            Unknown phase: {room.phase}
          </div>
        );
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <PhaseTransition phaseKey={transitionKey}>
          {renderPhase()}
        </PhaseTransition>
      </div>
      <ChatPanel roomId={room.id} />
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
