"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useGameStore, selectConnectedPlayers, selectMyPlayer } from "@/store/gameStore";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils/cn";
import type { GameLanguage, Player } from "@/types/game";

const LANG_LABELS: Record<GameLanguage, string> = {
  en: "🇬🇧 English",
  fr: "🇫🇷 Français",
  es: "🇪🇸 Español",
};

export function LobbyPhase() {
  const room = useGameStore((s) => s.room);
  const players = useGameStore(useShallow(selectConnectedPlayers));
  const myPlayer = useGameStore(selectMyPlayer);
  const voteKicks = useGameStore(useShallow((s) => s.voteKicks));
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const [copying, setCopying] = useState(false);
  const [startLoading, setStartLoading] = useState(false);
  const [langLoading, setLangLoading] = useState(false);
  const [modalTarget, setModalTarget] = useState<Player | null>(null);
  const [kicking, setKicking] = useState(false);

  const isCreator = myPlayer?.id === room?.creator_id;
  const currentLang: GameLanguage = (room?.language as GameLanguage) ?? "en";
  const canKick = players.length > 2;

  const handleKickConfirm = async () => {
    if (!myPlayerId || !room || !modalTarget || kicking) return;
    setKicking(true);
    await fetch("/api/players/votekick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voterId: myPlayerId, targetId: modalTarget.id, roomId: room.id }),
    });
    setKicking(false);
    setModalTarget(null);
  };

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

  const handleChangeLang = async (lang: GameLanguage) => {
    if (!myPlayer || !room || langLoading) return;
    setLangLoading(true);
    await fetch("/api/rooms/language", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: room.id, playerId: myPlayer.id, language: lang }),
    });
    setLangLoading(false);
  };

  return (
    <>
    <main className="flex flex-col items-center gap-8 px-6 py-10 flex-1 min-h-0 overflow-y-auto">
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
        <p className="text-white/40 text-sm mt-2">
          Write the missing subtitle. Be funny.
        </p>
      </div>

      {/* Share link */}
      <Button variant="secondary" size="sm" onClick={handleCopy}>
        {copying ? "Copied!" : "Copy invite link"}
      </Button>

      {/* Language selection */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-white/40 text-xs uppercase tracking-widest">Language</p>
        {isCreator ? (
          <select
            value={currentLang}
            onChange={(e) => handleChangeLang(e.target.value as GameLanguage)}
            disabled={langLoading}
            className="px-4 py-2 rounded-xl border border-white/15 bg-white/5 text-white text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer appearance-none text-center"
          >
            {(Object.entries(LANG_LABELS) as [GameLanguage, string][]).map(([code, label]) => (
              <option key={code} value={code} className="bg-black text-white">
                {label}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-white font-semibold text-sm">{LANG_LABELS[currentLang]}</p>
        )}
      </div>

      {/* Player list */}
      <div className="w-full max-w-sm space-y-2">
        {players.map((player) => {
          const isMe = player.id === myPlayer?.id;
          const clickable = canKick && !isMe;
          const alreadyVotedKick = !isMe && voteKicks.some(
            (vk) => vk.voter_player_id === myPlayerId && vk.target_player_id === player.id
          );
          return (
            <div
              key={player.id}
              onClick={() => clickable && setModalTarget(player)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-2xl border-2 border-white/10 bg-white/5 transition-colors",
                clickable && "cursor-pointer hover:bg-white/10",
                alreadyVotedKick && "border-red-500/40 bg-red-900/20"
              )}
            >
              <Avatar
                pseudo={player.pseudo}
                avatarIndex={player.avatar_index}
                size="md"
              />
              <span className={cn("flex-1 font-semibold", alreadyVotedKick ? "text-red-300/80" : "text-white")}>
                {player.pseudo}
                {isMe && (
                  <span className="text-white/40 text-sm ml-1">(you)</span>
                )}
              </span>
              {player.id === room?.creator_id && (
                <span className="text-yellow-400 text-xs font-semibold uppercase tracking-wide">
                  Host
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Status / action */}
      {players.length < 2 && (
        <p className="text-white/40 text-sm text-center">
          Waiting for at least one more player…
        </p>
      )}

      {isCreator ? (
        <Button
          variant="brand"
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

      {/* Vote-kick confirmation modal */}
      {modalTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => !kicking && setModalTarget(null)}
        >
          <div
            className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-5 mx-4 w-full max-w-xs flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <Avatar pseudo={modalTarget.pseudo} avatarIndex={modalTarget.avatar_index} size="md" />
              <p className="text-white font-bold">{modalTarget.pseudo}</p>
            </div>

            <p className="text-white/70 text-sm">
              Vote to kick <span className="text-white font-semibold">{modalTarget.pseudo}</span> from the room?
              More than half of all other players must agree.
            </p>

            {voteKicks.some(
              (vk) => vk.voter_player_id === myPlayerId && vk.target_player_id === modalTarget.id
            ) ? (
              <p className="text-red-400 text-sm text-center font-medium">
                You already voted to kick {modalTarget.pseudo}
              </p>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setModalTarget(null)}
                  disabled={kicking}
                  className="flex-1 py-2 rounded-xl border border-white/15 text-white/60 text-sm font-semibold hover:bg-white/5 transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  onClick={handleKickConfirm}
                  disabled={kicking}
                  className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-colors disabled:opacity-40"
                >
                  {kicking ? "Voting…" : "Vote to kick"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
