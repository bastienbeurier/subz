import type { Answer } from "@/types/game";

/**
 * Returns a map of playerId → points earned this round.
 *
 * Base: +1 per vote received. Clean-sweep bonus: +2 extra when *every other*
 * answer received zero votes AND there were enough voters for a meaningful
 * sweep. Using the live vote tally (instead of comparing to the current
 * connected-player count) keeps the bonus consistent even if a voter
 * disconnected between casting their vote and the round being scored.
 */
export function calculateRoundScores(answers: Answer[]): Map<string, number> {
  const scores = new Map<string, number>();
  const totalVotes = answers.reduce((sum, a) => sum + a.vote_count, 0);

  for (const answer of answers) {
    const points = answer.vote_count;
    // Clean sweep: this answer received every vote cast this round, and there
    // was more than one voter (so it wasn't a trivial 1-vote "sweep").
    const sweep = answer.vote_count > 0 && answer.vote_count === totalVotes && totalVotes >= 2;
    scores.set(answer.player_id, points + (sweep ? 2 : 0));
  }

  return scores;
}
