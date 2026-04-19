"use client";

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

  const sorted = [...players].sort((a, b) => b.score - a.score);
  const showSubmitStatus = room?.phase === "answering";
  const showVoteStatus = room?.phase === "voting";

  return (
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
            />
          );
        })}
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
}

function PlayerChip({ player, isMe, submitted, voted, showReady }: PlayerChipProps) {
  const showCheck = submitted || voted || (showReady && player.is_ready);

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-full shrink-0 transition-colors select-none",
        isMe ? "bg-white/15" : "bg-white/5"
      )}
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
