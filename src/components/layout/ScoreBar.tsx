"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useGameStore, selectConnectedPlayers, selectMyPlayer } from "@/store/gameStore";
import { TOTAL_ROUNDS } from "@/types/game";
import { cn } from "@/lib/utils/cn";
import type { Player } from "@/types/game";

export function ScoreBar() {
  const room = useGameStore((s) => s.room);
  const players = useGameStore(selectConnectedPlayers);
  const myPlayer = useGameStore(selectMyPlayer);
  const hasSubmittedAnswer = useGameStore((s) => s.hasSubmittedAnswer);
  const hasVoted = useGameStore((s) => s.hasVoted);
  const answers = useGameStore((s) => s.answers);
  const votes = useGameStore((s) => s.votes);

  const [kickTarget, setKickTarget] = useState<Player | null>(null);
  const [kickLoading, setKickLoading] = useState(false);

  const sorted = [...players].sort((a, b) => b.score - a.score);
  const showSubmitStatus = room?.phase === "answering";
  const showVoteStatus = room?.phase === "voting";

  const handleLongPress = (player: Player) => {
    if (!myPlayer || player.id === myPlayer.id) return;
    setKickTarget(player);
  };

  const handleKick = async () => {
    if (!kickTarget || !myPlayer || !room) return;
    setKickLoading(true);
    await fetch("/api/players/kick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kickerId: myPlayer.id,
        targetId: kickTarget.id,
        roomId: room.id,
      }),
    });
    setKickLoading(false);
    setKickTarget(null);
  };

  return (
    <>
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-sm border-b border-white/10 px-3 py-2">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
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

            return (
              <PlayerChip
                key={player.id}
                player={player}
                isMe={isMe}
                submitted={submitted}
                voted={voted}
                showReady={room?.phase === "lobby"}
                onLongPress={() => handleLongPress(player)}
              />
            );
          })}
        </div>
      </div>

      <Modal open={!!kickTarget} onClose={() => setKickTarget(null)}>
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <p className="text-white/50 text-sm">Kick player?</p>
            <p className="text-white font-bold text-lg">{kickTarget?.pseudo}</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setKickTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              loading={kickLoading}
              onClick={handleKick}
            >
              Kick
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

interface PlayerChipProps {
  player: Player;
  isMe: boolean;
  submitted: boolean;
  voted: boolean;
  showReady: boolean;
  onLongPress: () => void;
}

function PlayerChip({
  player,
  isMe,
  submitted,
  voted,
  showReady,
  onLongPress,
}: PlayerChipProps) {
  const [pressTimer, setPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const startPress = () => {
    const t = setTimeout(onLongPress, 600);
    setPressTimer(t);
  };

  const endPress = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };

  const showCheck = submitted || voted || (showReady && player.is_ready);

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-full shrink-0 transition-colors select-none",
        isMe ? "bg-white/15" : "bg-white/5"
      )}
      onPointerDown={startPress}
      onPointerUp={endPress}
      onPointerLeave={endPress}
    >
      <Avatar pseudo={player.pseudo} avatarIndex={player.avatar_index} size="sm" />
      <span
        className={cn(
          "text-xs font-semibold max-w-[60px] truncate",
          isMe ? "text-white" : "text-white/70"
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
