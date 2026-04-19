"use client";

import { useState } from "react";
import { useGameStore, selectCurrentAnswers, selectConnectedPlayers } from "@/store/gameStore";
import { Card } from "@/components/ui/Card";
import { Timer } from "@/components/ui/Timer";
import { VOTING_DURATION_MS } from "@/types/game";

export function VotingPhase() {
  const room = useGameStore((s) => s.room);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const answers = useGameStore(selectCurrentAnswers);
  const players = useGameStore(selectConnectedPlayers);
  const hasVoted = useGameStore((s) => s.hasVoted);
  const setVoted = useGameStore((s) => s.setVoted);
  const votes = useGameStore((s) => s.votes);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const myAnswer = answers.find((a) => a.player_id === myPlayerId);
  const votableAnswers = answers.filter((a) => a.player_id !== myPlayerId);
  const votedPlayerIds = new Set(
    votes
      .filter((v) => v.round === room?.current_round)
      .map((v) => v.voter_player_id)
  );

  const handleVote = async (answerId: string) => {
    if (!room || !myPlayerId || hasVoted || loading) return;
    setSelectedId(answerId);
    setLoading(true);

    const res = await fetch("/api/game/submit-vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: room.id,
        voterId: myPlayerId,
        answerId,
        round: room.current_round,
      }),
    });

    setLoading(false);
    if (res.ok) {
      setVoted(true);
    } else {
      setSelectedId(null);
    }
  };

  const handleTimerExpire = async () => {
    if (!room) return;
    await fetch("/api/game/advance-phase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: room.id, expectedPhase: "voting" }),
    });
  };

  return (
    <main className="flex flex-col min-h-screen px-4 py-6 gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Vote for the best</h2>
        {room?.voting_deadline && (
          <Timer
            deadline={room.voting_deadline}
            totalMs={VOTING_DURATION_MS}
            onExpire={handleTimerExpire}
          />
        )}
      </div>

      {myAnswer && (
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white/40 text-sm">
          <span className="text-white/20 text-xs uppercase tracking-wider block mb-1">Your answer</span>
          {myAnswer.text}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {votableAnswers.map((answer) => (
          <Card
            key={answer.id}
            selected={selectedId === answer.id}
            onClick={hasVoted ? undefined : () => handleVote(answer.id)}
            className="text-white font-medium text-base"
          >
            {answer.text}
            {selectedId === answer.id && hasVoted && (
              <span className="float-right text-violet-400">✓</span>
            )}
          </Card>
        ))}
      </div>

      {hasVoted && (
        <div className="text-center text-white/40 text-sm mt-2">
          Waiting for others ({votedPlayerIds.size}/{players.length})…
        </div>
      )}
    </main>
  );
}
