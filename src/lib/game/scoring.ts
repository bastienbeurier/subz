import type { Answer, Player } from "@/types/game";

// Returns a map of playerId → points earned this round
export function calculateRoundScores(
  answers: Answer[],
  activePlayers: Player[]
): Map<string, number> {
  const scores = new Map<string, number>();
  const activeCount = activePlayers.length;

  for (const answer of answers) {
    const points = answer.vote_count;
    scores.set(answer.player_id, points);

    // Clean sweep bonus: all other players voted for this answer
    if (answer.vote_count === activeCount - 1 && activeCount > 1) {
      scores.set(answer.player_id, points + 2);
    }
  }

  return scores;
}
