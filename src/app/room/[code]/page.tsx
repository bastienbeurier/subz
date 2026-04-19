"use client";

import { useParams } from "next/navigation";
import { useGameStore } from "@/store/gameStore";
import { usePlayerSession } from "@/hooks/usePlayerSession";
import { LobbyPhase } from "@/components/game/LobbyPhase";
import JoinScreen from "@/components/game/JoinScreen";

// Phase components will be imported here as they are built
const PhaseComponents: Record<string, React.ComponentType> = {
  lobby: LobbyPhase,
};

export default function RoomPage() {
  const params = useParams();
  const code = (params.code as string).toUpperCase();
  const session = usePlayerSession();
  const room = useGameStore((s) => s.room);
  const myPlayerId = useGameStore((s) => s.myPlayerId);

  // No session yet — show inline join screen
  if (!session || !myPlayerId) {
    return <JoinScreen roomCode={code} />;
  }

  // Room not yet loaded — show loading state
  if (!room) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const PhaseComponent = PhaseComponents[room.phase];

  if (!PhaseComponent) {
    // Fallback for phases not yet implemented
    return (
      <div className="flex-1 flex items-center justify-center text-white/40">
        Phase: {room.phase}
      </div>
    );
  }

  return <PhaseComponent />;
}
