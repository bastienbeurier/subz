"use client";

import { useEffect } from "react";
import { useGameStore, selectSortedPlayers } from "@/store/gameStore";
import { useShallow } from "zustand/react/shallow";
import { Avatar } from "@/components/ui/Avatar";
import { Timer } from "@/components/ui/Timer";
import { FINAL_DURATION_MS } from "@/types/game";
import confetti from "canvas-confetti";

export function FinalPhase() {
  const room = useGameStore((s) => s.room);
  const players = useGameStore(useShallow(selectSortedPlayers));

  const [first, second, third, ...rest] = players;

  // Fire confetti on mount
  useEffect(() => {
    const fire = (opts: confetti.Options) =>
      confetti({ particleCount: 80, spread: 70, ...opts });

    fire({ origin: { x: 0.2, y: 0.7 }, angle: 60 });
    fire({ origin: { x: 0.8, y: 0.7 }, angle: 120 });

    const t1 = setTimeout(() => fire({ origin: { x: 0.5, y: 0.6 }, angle: 90 }), 400);
    const t2 = setTimeout(() => fire({ origin: { x: 0.3, y: 0.5 }, angle: 75 }), 800);
    const t3 = setTimeout(() => fire({ origin: { x: 0.7, y: 0.5 }, angle: 105 }), 1200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const handleTimerExpire = async () => {
    if (!room) return;
    await fetch("/api/game/advance-phase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: room.id, expectedPhase: "final" }),
    });
  };

  return (
    <main className="flex flex-col flex-1 min-h-0 px-4 py-8 gap-8 items-center overflow-y-auto">
      <div className="text-center space-y-1">
        <p className="text-white/40 text-xs uppercase tracking-widest">Game over</p>
        <h1 className="text-4xl font-black text-white">Final scores</h1>
      </div>

      {/* Podium */}
      <div className="w-full max-w-sm flex flex-col gap-3">
        {first && <PodiumEntry player={first} rank={1} />}
        {second && <PodiumEntry player={second} rank={2} />}
        {third && <PodiumEntry player={third} rank={3} />}
        {rest.map((p, i) => (
          <PodiumEntry key={p.id} player={p} rank={i + 4} />
        ))}
      </div>

      {/* Countdown to restart */}
      <div className="flex flex-col items-center gap-3 mt-auto">
        <p className="text-white/40 text-sm">Back to lobby in…</p>
        {room?.auto_advance_at && (
          <Timer
            deadline={room.auto_advance_at}
            totalMs={FINAL_DURATION_MS}
            onExpire={handleTimerExpire}
          />
        )}
      </div>
    </main>
  );
}

interface PodiumEntryProps {
  player: { id: string; pseudo: string; avatar_index: number; score: number; is_connected: boolean };
  rank: number;
}

function PodiumEntry({ player, rank }: PodiumEntryProps) {
  const rankStyles: Record<number, string> = {
    1: "border-yellow-400/60 bg-yellow-400/10",
    2: "border-zinc-400/60 bg-zinc-400/10",
    3: "border-amber-600/60 bg-amber-600/10",
  };
  const rankEmoji: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-opacity ${
        rankStyles[rank] ?? "border-white/10 bg-white/5"
      } ${player.is_connected ? "" : "opacity-40"}`}
    >
      <span className="text-xl w-8 text-center">
        {rankEmoji[rank] ?? <span className="text-white/30 font-bold text-sm">{rank}</span>}
      </span>
      <Avatar pseudo={player.pseudo} avatarIndex={player.avatar_index} size="md" />
      <span className="flex-1 font-bold text-white">{player.pseudo}</span>
      {!player.is_connected && (
        <span className="text-white/30 text-xs mr-1">left</span>
      )}
      <span
        className={`font-black text-lg tabular-nums ${
          rank === 1 ? "text-yellow-400" : "text-white/60"
        }`}
      >
        {player.score}
      </span>
    </div>
  );
}
