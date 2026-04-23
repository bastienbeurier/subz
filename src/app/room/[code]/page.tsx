"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useGameStore } from "@/store/gameStore";
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
import type { Video, VoteKick } from "@/types/game";

export default function RoomPage() {
  const params = useParams();
  const code = (params.code as string).toUpperCase();
  const room = useGameStore((s) => s.room);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const players = useGameStore((s) => s.players);
  const setSubmitted = useGameStore((s) => s.setSubmitted);
  const setVoted = useGameStore((s) => s.setVoted);
  const setVoteKicks = useGameStore((s) => s.setVoteKicks);
  const [video, setVideo] = useState<Video | null>(null);

  // Reset per-round local flags when phase changes
  useEffect(() => {
    if (room?.phase === "answering") setSubmitted(false);
    if (room?.phase === "voting") setVoted(false);
  }, [room?.phase, setSubmitted, setVoted]);

  // Load initial vote kicks for this room
  useEffect(() => {
    if (!room?.id) return;
    const supabase = createClient();
    supabase
      .from("vote_kicks")
      .select()
      .eq("room_id", room.id)
      .then(({ data }) => {
        if (data) setVoteKicks(data as VoteKick[]);
      });
  }, [room?.id, setVoteKicks]);

  // Load video + language-filtered subtitles when video or room language changes
  useEffect(() => {
    if (!room?.current_video_id) {
      setVideo(null);
      return;
    }
    const supabase = createClient();
    const lang = room.language ?? "en";
    Promise.all([
      supabase.from("videos").select("*").eq("id", room.current_video_id).single(),
      supabase
        .from("video_subtitles")
        .select("*")
        .eq("video_id", room.current_video_id)
        .eq("language", lang)
        .order("start_ms", { ascending: true }),
    ]).then(([{ data: videoData }, { data: subtitles }]) => {
      if (videoData) {
        setVideo({ ...(videoData as object), subtitles: subtitles ?? [] } as Video);
      }
    });
  }, [room?.current_video_id, room?.language]);

  // No player identity → show inline join screen
  if (!myPlayerId) {
    return <JoinScreen roomCode={code} />;
  }

  // Room not yet loaded
  if (!room) {
    return <Spinner />;
  }

  // Player was kicked (record deleted while session still in memory)
  const isKicked = room && players.length > 0 && !players.find((p) => p.id === myPlayerId);
  if (isKicked) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
        <p className="text-4xl">🚫</p>
        <p className="text-white font-bold text-xl">You were kicked</p>
        <p className="text-white/50 text-sm">The majority of players voted to remove you from the room.</p>
        <a href="/" className="mt-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold text-sm transition-colors">
          Back to home
        </a>
      </div>
    );
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
