"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useGameStore, selectConnectedPlayers, selectMyPlayer } from "@/store/gameStore";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils/cn";

export function LobbyPhase() {
  const room = useGameStore((s) => s.room);
  const players = useGameStore(useShallow(selectConnectedPlayers));
  const myPlayer = useGameStore(selectMyPlayer);
  const [copying, setCopying] = useState(false);
  const [readyLoading, setReadyLoading] = useState(false);

  const isReady = myPlayer?.is_ready ?? false;
  const allReady = players.length >= 2 && players.every((p) => p.is_ready);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  const handleToggleReady = async () => {
    if (!myPlayer || !room) return;
    setReadyLoading(true);
    try {
      await fetch("/api/players/ready", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: myPlayer.id,
          roomId: room.id,
          ready: !isReady,
        }),
      });
    } finally {
      setReadyLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center gap-8 px-6 py-10 flex-1 min-h-0 overflow-y-auto">
      {/* Room code */}
      <div className="text-center">
        <p className="text-white/40 text-xs uppercase tracking-widest mb-1">
          Room code
        </p>
        <h1 className="text-5xl font-black tracking-widest text-white">
          {room?.code}
        </h1>
      </div>

      {/* Share link */}
      <Button variant="secondary" size="sm" onClick={handleCopy}>
        {copying ? "Copied!" : "Copy invite link"}
      </Button>

      {/* Player list */}
      <div className="w-full max-w-sm space-y-2">
        {players.map((player) => (
          <div
            key={player.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-2xl border-2 transition-colors",
              player.is_ready
                ? "border-green-500/50 bg-green-500/5"
                : "border-white/10 bg-white/5"
            )}
          >
            <Avatar
              pseudo={player.pseudo}
              avatarIndex={player.avatar_index}
              size="md"
            />
            <span className="flex-1 font-semibold text-white">
              {player.pseudo}
              {player.id === myPlayer?.id && (
                <span className="text-white/40 text-sm ml-1">(you)</span>
              )}
            </span>
            {player.is_ready ? (
              <span className="text-green-400 font-bold text-sm">Ready ✓</span>
            ) : (
              <span className="text-white/30 text-sm">Waiting…</span>
            )}
          </div>
        ))}
      </div>

      {/* Status message */}
      {players.length < 2 && (
        <p className="text-white/40 text-sm text-center">
          Waiting for at least one more player…
        </p>
      )}
      {players.length >= 2 && !allReady && (
        <p className="text-white/40 text-sm text-center">
          Everyone needs to be ready to start
        </p>
      )}

      {/* Ready toggle */}
      <Button
        variant={isReady ? "secondary" : "primary"}
        onClick={handleToggleReady}
        loading={readyLoading}
        disabled={players.length < 2}
        className="w-full max-w-sm"
      >
        {isReady ? "Not ready" : "I'm ready!"}
      </Button>
    </main>
  );
}
