"use client";

import { useEffect, useRef, useState } from "react";
import {
  useGameStore,
  selectActivePlayersThisRound,
} from "@/store/gameStore";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/Button";
import { Timer } from "@/components/ui/Timer";
import { Avatar } from "@/components/ui/Avatar";
import { ANSWERING_DURATION_MS } from "@/types/game";

export function AnsweringPhase() {
  const room = useGameStore((s) => s.room);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const players = useGameStore(useShallow(selectActivePlayersThisRound));
  const answers = useGameStore((s) => s.answers);
  const hasSubmitted = useGameStore((s) => s.hasSubmittedAnswer);
  const setSubmitted = useGameStore((s) => s.setSubmitted);

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const advanceFiredRef = useRef(false);

  const submittedPlayerIds = new Set(
    answers
      .filter((a) => a.round === room?.current_round)
      .map((a) => a.player_id)
  );

  // When every active player has submitted, race to fire advance-phase.
  // Server is idempotent (WHERE phase='answering') so multiple clients firing
  // is safe; firedRef keeps a single client from firing repeatedly.
  useEffect(() => {
    if (!room || room.phase !== "answering") {
      advanceFiredRef.current = false;
      return;
    }
    if (players.length === 0) return;
    const allSubmitted = players.every((p) => submittedPlayerIds.has(p.id));
    if (allSubmitted && !advanceFiredRef.current) {
      advanceFiredRef.current = true;
      fetch("/api/game/advance-phase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: room.id, expectedPhase: "answering" }),
      }).catch(() => {
        advanceFiredRef.current = false;
      });
    }
  }, [room, players, submittedPlayerIds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room || !myPlayerId || !text.trim()) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/game/submit-answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: room.id,
        playerId: myPlayerId,
        text: text.trim(),
        round: room.current_round,
      }),
    });

    setLoading(false);
    if (res.ok) {
      setSubmitted(true);
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to submit");
    }
  };

  const handleTimerExpire = async () => {
    if (!room) return;
    await fetch("/api/game/advance-phase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: room.id, expectedPhase: "answering" }),
    });
  };

  return (
    <main className="flex flex-col flex-1 min-h-0 px-4 py-6 gap-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Write your subtitle</h2>
        {room?.answering_deadline && (
          <Timer
            deadline={room.answering_deadline}
            totalMs={ANSWERING_DURATION_MS}
            onExpire={handleTimerExpire}
            tickSound
          />
        )}
      </div>

      {!hasSubmitted ? (
        <form onSubmit={handleSubmit} autoComplete="off" className="flex flex-col gap-3 flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your subtitle here…"
            maxLength={180}
            className="flex-1 min-h-[120px] p-4 rounded-2xl bg-white/10 text-white text-lg placeholder:text-white/30 border-2 border-transparent focus:border-violet-500 focus:outline-none resize-none"
            autoFocus
            autoComplete="nope"
            autoCorrect="off"
            spellCheck={false}
          />
          <div className="flex justify-between items-center">
            <span className="text-white/30 text-sm">{text.length}/180</span>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button type="submit" loading={loading} disabled={!text.trim()} className="w-full">
            Submit
          </Button>
        </form>
      ) : (
        <div className="flex-1 flex flex-col gap-4">
          <div className="p-4 rounded-2xl bg-green-500/10 border-2 border-green-500/30 text-green-400 font-bold text-center">
            Submitted! Waiting for others…
          </div>
          <div className="space-y-2">
            {players.map((player) => (
              <div key={player.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                <Avatar pseudo={player.pseudo} avatarIndex={player.avatar_index} size="sm" />
                <span className="text-white/70 text-sm flex-1">{player.pseudo}</span>
                {submittedPlayerIds.has(player.id) ? (
                  <span className="text-green-400 text-sm font-bold">✓</span>
                ) : (
                  <span className="text-white/30 text-sm">…</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
