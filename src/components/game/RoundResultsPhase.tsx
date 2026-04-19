"use client";

import { useGameStore, selectCurrentAnswers, selectSortedPlayers } from "@/store/gameStore";
import { Avatar } from "@/components/ui/Avatar";
import { Timer } from "@/components/ui/Timer";
import { ROUND_RESULTS_DURATION_MS } from "@/types/game";

export function RoundResultsPhase() {
  const room = useGameStore((s) => s.room);
  const answers = useGameStore(selectCurrentAnswers);
  const players = useGameStore(selectSortedPlayers);
  const votes = useGameStore((s) => s.votes);

  const currentVotes = votes.filter((v) => v.round === room?.current_round);

  const handleTimerExpire = async () => {
    if (!room) return;
    await fetch("/api/game/advance-phase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: room.id, expectedPhase: "round_results" }),
    });
  };

  const getAuthor = (playerId: string) =>
    players.find((p) => p.id === playerId);

  const getVoteCount = (answerId: string) =>
    currentVotes.filter((v) => v.answer_id === answerId).length;

  return (
    <main className="flex flex-col min-h-screen px-4 py-6 gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Round results</h2>
        {room?.auto_advance_at && (
          <Timer
            deadline={room.auto_advance_at}
            totalMs={ROUND_RESULTS_DURATION_MS}
            onExpire={handleTimerExpire}
          />
        )}
      </div>

      {/* Answer reveal */}
      <div className="flex flex-col gap-3">
        {answers
          .slice()
          .sort((a, b) => getVoteCount(b.id) - getVoteCount(a.id))
          .map((answer) => {
            const author = getAuthor(answer.player_id);
            const voteCount = getVoteCount(answer.id);
            return (
              <div
                key={answer.id}
                className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2"
              >
                <p className="text-white font-medium">{answer.text}</p>
                <div className="flex items-center justify-between">
                  {author && (
                    <div className="flex items-center gap-2">
                      <Avatar
                        pseudo={author.pseudo}
                        avatarIndex={author.avatar_index}
                        size="sm"
                      />
                      <span className="text-white/50 text-sm">{author.pseudo}</span>
                    </div>
                  )}
                  <span className="text-violet-400 font-bold text-sm">
                    {voteCount} {voteCount === 1 ? "vote" : "votes"}
                  </span>
                </div>
              </div>
            );
          })}
      </div>

      {/* Scoreboard */}
      <div>
        <h3 className="text-white/40 text-xs uppercase tracking-widest mb-2">Scores</h3>
        <div className="flex flex-col gap-2">
          {players.map((player, i) => (
            <div key={player.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
              <span className="text-white/30 w-5 text-sm font-bold">{i + 1}</span>
              <Avatar pseudo={player.pseudo} avatarIndex={player.avatar_index} size="sm" />
              <span className="flex-1 text-white font-medium">{player.pseudo}</span>
              <span className="text-violet-400 font-black">{player.score}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
