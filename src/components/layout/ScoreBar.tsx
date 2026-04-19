"use client";

import { Avatar } from "@/components/ui/Avatar";
import { useGameStore, selectConnectedPlayers, selectMyPlayer } from "@/store/gameStore";
import { TOTAL_ROUNDS } from "@/types/game";
import { cn } from "@/lib/utils/cn";

export function ScoreBar() {
  const room = useGameStore((s) => s.room);
  const players = useGameStore(selectConnectedPlayers);
  const myPlayer = useGameStore(selectMyPlayer);
  const hasSubmittedAnswer = useGameStore((s) => s.hasSubmittedAnswer);
  const hasVoted = useGameStore((s) => s.hasVoted);

  const sorted = [...players].sort((a, b) => b.score - a.score);

  const showSubmitStatus = room?.phase === "answering";
  const showVoteStatus = room?.phase === "voting";

  return (
    <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-sm border-b border-white/10 px-3 py-2">
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
        {/* Round indicator */}
        {room && room.current_round > 0 && (
          <span className="shrink-0 text-xs font-bold text-white/40 mr-2">
            {room.current_round}/{TOTAL_ROUNDS}
          </span>
        )}

        {sorted.map((player) => {
          const isMe = player.id === myPlayer?.id;
          const submitted =
            showSubmitStatus &&
            (isMe ? hasSubmittedAnswer : undefined);
          const voted =
            showVoteStatus &&
            (isMe ? hasVoted : undefined);

          return (
            <div
              key={player.id}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-full shrink-0 transition-colors",
                isMe ? "bg-white/15" : "bg-white/5"
              )}
            >
              <Avatar
                pseudo={player.pseudo}
                avatarIndex={player.avatar_index}
                size="sm"
              />
              <span
                className={cn(
                  "text-xs font-semibold max-w-[60px] truncate",
                  isMe ? "text-white" : "text-white/70"
                )}
              >
                {player.pseudo}
              </span>
              {(submitted || voted) ? (
                <span className="text-green-400 text-xs">✓</span>
              ) : (
                <span className="text-xs font-bold text-white/50">
                  {player.score}
                </span>
              )}
              {player.is_ready && room?.phase === "lobby" && (
                <span className="text-green-400 text-xs">✓</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
