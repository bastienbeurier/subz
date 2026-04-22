"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useGameStore, selectConnectedPlayers, selectMyPlayer } from "@/store/gameStore";
import { useShallow } from "zustand/react/shallow";

export function LobbyPhase() {
  const room = useGameStore((s) => s.room);
  const players = useGameStore(useShallow(selectConnectedPlayers));
  const myPlayer = useGameStore(selectMyPlayer);
  const [copying, setCopying] = useState(false);
  const [startLoading, setStartLoading] = useState(false);

  const isCreator = myPlayer?.id === room?.creator_id;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  const handleStart = async () => {
    if (!myPlayer || !room) return;
    setStartLoading(true);
    try {
      await fetch("/api/rooms/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: myPlayer.id, roomId: room.id }),
      });
    } finally {
      setStartLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center gap-8 px-6 py-10 flex-1 min-h-0 overflow-y-auto">
      {/* Leave button */}
      <div className="self-start">
        <Link href="/" className="text-white/40 hover:text-white/80 transition-colors text-sm flex items-center gap-1">
          ← Leave
        </Link>
      </div>

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
            className="flex items-center gap-3 p-3 rounded-2xl border-2 border-white/10 bg-white/5"
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
            {player.id === room?.creator_id && (
              <span className="text-yellow-400 text-xs font-semibold uppercase tracking-wide">
                Host
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Status / action */}
      {players.length < 2 && (
        <p className="text-white/40 text-sm text-center">
          Waiting for at least one more player…
        </p>
      )}

      {isCreator ? (
        <Button
          variant="primary"
          onClick={handleStart}
          loading={startLoading}
          disabled={players.length < 2}
          className="w-full max-w-sm"
        >
          Start game
        </Button>
      ) : players.length >= 2 ? (
        <p className="text-white/40 text-sm text-center">
          Waiting for the host to start the game…
        </p>
      ) : null}
    </main>
  );
}
