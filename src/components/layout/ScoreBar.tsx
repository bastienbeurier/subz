"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useGameStore, selectConnectedPlayers, selectMyPlayer } from "@/store/gameStore";
import { useShallow } from "zustand/react/shallow";
import { TOTAL_ROUNDS } from "@/types/game";
import { cn } from "@/lib/utils/cn";
import type { Player } from "@/types/game";

export function ScoreBar() {
  const room = useGameStore((s) => s.room);
  const players = useGameStore(useShallow(selectConnectedPlayers));
  const myPlayer = useGameStore(selectMyPlayer);
  const answers = useGameStore((s) => s.answers);
  const votes = useGameStore((s) => s.votes);
  const voteKicks = useGameStore(useShallow((s) => s.voteKicks));
  const myPlayerId = useGameStore((s) => s.myPlayerId);

  const [kicking, setKicking] = useState<string | null>(null);

  const sorted = [...players].sort((a, b) => b.score - a.score);
  const showSubmitStatus = room?.phase === "answering";
  const showVoteStatus = room?.phase === "voting";
  const canKick = players.length > 2;

  const handleKick = async (targetId: string) => {
    if (!myPlayerId || !room || kicking) return;
    setKicking(targetId);
    await fetch("/api/players/votekick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voterId: myPlayerId, targetId, roomId: room.id }),
    });
    setKicking(null);
  };

  return (
    <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-sm border-b border-white/10 px-3 py-2">
      <div className="flex items-center gap-1">
        <Link href="/" className="shrink-0 mr-2 text-white/40 hover:text-white/80 transition-colors text-lg leading-none" title="Leave game">
          ←
        </Link>
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-1">
        {room && room.current_round > 0 && (
          <span className="shrink-0 text-xs font-bold text-white/40 mr-2">
            {room.current_round}/{TOTAL_ROUNDS}
          </span>
        )}

        {sorted.map((player) => {
          const isMe = player.id === myPlayer?.id;
          const submitted =
            showSubmitStatus &&
            answers.some(
              (a) => a.player_id === player.id && a.round === room?.current_round
            );
          const voted =
            showVoteStatus &&
            votes.some(
              (v) => v.voter_player_id === player.id && v.round === room?.current_round
            );
          const alreadyVotedKick =
            !isMe &&
            voteKicks.some(
              (vk) => vk.voter_player_id === myPlayerId && vk.target_player_id === player.id
            );

          return (
            <PlayerChip
              key={player.id}
              player={player}
              isMe={isMe}
              submitted={submitted}
              voted={voted}
              showReady={room?.phase === "lobby"}
              canKick={canKick && !isMe}
              alreadyVotedKick={alreadyVotedKick}
              kicking={kicking === player.id}
              onKick={() => handleKick(player.id)}
            />
          );
        })}
        </div>
      </div>
    </div>
  );
}

interface PlayerChipProps {
  player: Player;
  isMe: boolean;
  submitted: boolean;
  voted: boolean;
  showReady: boolean;
  canKick: boolean;
  alreadyVotedKick: boolean;
  kicking: boolean;
  onKick: () => void;
}

function PlayerChip({
  player,
  isMe,
  submitted,
  voted,
  showReady,
  canKick,
  alreadyVotedKick,
  kicking,
  onKick,
}: PlayerChipProps) {
  const showCheck = submitted || voted || (showReady && player.is_ready);
  const clickable = canKick && !alreadyVotedKick && !kicking;

  return (
    <div
      onClick={clickable ? onKick : undefined}
      title={
        !isMe && canKick
          ? alreadyVotedKick
            ? `Vote kick envoyé contre ${player.pseudo}`
            : `Voter pour expulser ${player.pseudo}`
          : undefined
      }
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-full shrink-0 transition-colors select-none",
        isMe ? "bg-white/15" : "bg-white/5",
        clickable && "cursor-pointer hover:bg-red-900/40 hover:ring-1 hover:ring-red-500/50",
        alreadyVotedKick && "ring-1 ring-red-500/60 bg-red-900/20"
      )}
    >
      <Avatar pseudo={player.pseudo} avatarIndex={player.avatar_index} size="sm" />
      <span
        className={cn(
          "text-xs font-semibold max-w-[60px] truncate",
          isMe ? "text-white" : "text-white/70",
          alreadyVotedKick && "text-red-300/80"
        )}
      >
        {player.pseudo}
      </span>
      {alreadyVotedKick ? (
        <span className="text-red-400 text-xs">✕</span>
      ) : showCheck ? (
        <span className="text-green-400 text-xs">✓</span>
      ) : (
        <span className="text-xs font-bold text-white/50 tabular-nums">
          {player.score}
        </span>
      )}
    </div>
  );
}
