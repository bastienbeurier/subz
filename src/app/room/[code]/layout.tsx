"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useGameStore } from "@/store/gameStore";
import { useRoomRealtime } from "@/hooks/useRoomRealtime";
import { useHeartbeat } from "@/hooks/useHeartbeat";
import { usePlayerSession } from "@/hooks/usePlayerSession";
import { ScoreBar } from "@/components/layout/ScoreBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { createClient } from "@/lib/supabase/client";
import type { Room, Player, Answer, Vote } from "@/types/game";

export default function RoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const code = (params.code as string).toUpperCase();
  const session = usePlayerSession();

  const {
    room,
    setRoom,
    setPlayers,
    setAnswers,
    setVotes,
    setMyPlayer,
    reset,
  } = useGameStore();

  // Load initial room snapshot + restore session
  useEffect(() => {
    if (!session) return;

    const load = async () => {
      const supabase = createClient();

      // Reconnect: mark player connected and get full snapshot
      const reconnectRes = await fetch("/api/players/reconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: session.playerId, roomCode: code }),
      });

      if (!reconnectRes.ok) return;

      const { room: r, player: p } = await reconnectRes.json();
      setRoom(r as Room);
      setMyPlayer(p.id, p.pseudo);

      // Load all players, answers, votes for the room
      const [{ data: players }, { data: answers }, { data: votes }] =
        await Promise.all([
          supabase.from("players").select().eq("room_id", r.id),
          supabase
            .from("answers")
            .select()
            .eq("room_id", r.id)
            .order("display_order", { ascending: true }),
          supabase.from("votes").select().eq("room_id", r.id),
        ]);

      if (players) setPlayers(players as Player[]);
      if (answers) setAnswers(answers as Answer[]);
      if (votes) setVotes(votes as Vote[]);
    };

    load();

    return () => reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.playerId, code]);

  // Subscribe to Realtime once we have the room id
  useRoomRealtime(room?.id ?? null);

  // Send heartbeats
  useHeartbeat(session?.playerId ?? null, room?.id ?? null);

  // Show scorebar only during active game phases
  const showScoreBar =
    room &&
    !["lobby"].includes(room.phase);

  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-[var(--background)]">
      {showScoreBar && <ScoreBar />}
      <div className="flex-1 flex flex-col min-h-0">
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
    </div>
  );
}
