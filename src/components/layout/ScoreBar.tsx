"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useGameStore, selectConnectedPlayers, selectMyPlayer } from "@/store/gameStore";
import { useShallow } from "zustand/react/shallow";
import { TOTAL_ROUNDS } from "@/types/game";
import { cn } from "@/lib/utils/cn";
import type { Player } from "@/types/game";
import { getVolume, setVolumeLevel } from "@/lib/volume";

export function ScoreBar() {
  const room = useGameStore((s) => s.room);
  const players = useGameStore(useShallow(selectConnectedPlayers));
  const myPlayer = useGameStore(selectMyPlayer);
  const answers = useGameStore((s) => s.answers);
  const votes = useGameStore((s) => s.votes);
  const voteKicks = useGameStore(useShallow((s) => s.voteKicks));
  const myPlayerId = useGameStore((s) => s.myPlayerId);

  const [modalTarget, setModalTarget] = useState<Player | null>(null);
  const [kicking, setKicking] = useState(false);
  const [volume, setVol] = useState(() => getVolume());

  const sorted = [...players].sort((a, b) => b.score - a.score);
  const showSubmitStatus = room?.phase === "answering";
  const showVoteStatus = room?.phase === "voting";
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

  return (
    <>
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-sm border-b border-white/10 px-3 py-2">
        <div className="flex items-center gap-1">
          <Link href="/" className="shrink-0 mr-2 text-white/40 hover:text-white/80 transition-colors text-lg leading-none" title="Leave game">
            ←
          </Link>
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-1 min-w-0">
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
                  onClick={() => !isMe && canKick && setModalTarget(player)}
                />
              );
            })}
          </div>
          <div className="shrink-0 flex items-center gap-1.5 ml-2">
            <span className="text-white/40 text-xs select-none">{volume === 0 ? "🔇" : "🔊"}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setVolumeLevel(v);
                setVol(v);
              }}
              className="w-16 accent-purple-500 cursor-pointer"
              title="Volume"
            />
          </div>
        </div>
      </div>

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
              <div>
                <p className="text-white font-bold">{modalTarget.pseudo}</p>
                <p className="text-white/40 text-xs">{modalTarget.score} pts</p>
              </div>
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

interface PlayerChipProps {
  player: Player;
  isMe: boolean;
  submitted: boolean;
  voted: boolean;
  showReady: boolean;
  canKick: boolean;
  alreadyVotedKick: boolean;
  onClick: () => void;
}

function PlayerChip({
  player,
  isMe,
  submitted,
  voted,
  showReady,
  canKick,
  alreadyVotedKick,
  onClick,
}: PlayerChipProps) {
  const showCheck = submitted || voted || (showReady && player.is_ready);
  const clickable = !isMe && canKick;

  return (
    <div
      onClick={clickable ? onClick : undefined}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-full shrink-0 transition-colors select-none",
        isMe ? "bg-white/15" : "bg-white/5",
        clickable && "cursor-pointer hover:bg-white/10",
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
      {showCheck ? (
        <span className="text-green-400 text-xs">✓</span>
      ) : (
        <span className="text-xs font-bold text-white/50 tabular-nums">
          {player.score}
        </span>
      )}
    </div>
  );
}
