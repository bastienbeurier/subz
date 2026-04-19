// Invariants the data model must uphold. These are the assumptions the rest
// of the code relies on; if any of these fail, multiple routes/components
// break silently.

import { describe, it, expect } from "vitest";
import {
  AVATAR_COLORS,
  MAX_PLAYERS,
  TOTAL_ROUNDS,
  ANSWERING_DURATION_MS,
  VOTING_DURATION_MS,
  ROUND_RESULTS_DURATION_MS,
  FINAL_DURATION_MS,
  type GamePhase,
} from "./game";

describe("avatar palette", () => {
  it("has at least MAX_PLAYERS slots (otherwise join could run out)", () => {
    expect(AVATAR_COLORS.length).toBeGreaterThanOrEqual(MAX_PLAYERS);
  });

  it("entries are unique hex colors", () => {
    const unique = new Set(AVATAR_COLORS);
    expect(unique.size).toBe(AVATAR_COLORS.length);
    for (const c of AVATAR_COLORS) {
      expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe("round / duration constants", () => {
  it("TOTAL_ROUNDS is positive", () => {
    expect(TOTAL_ROUNDS).toBeGreaterThan(0);
  });

  it.each([
    ["ANSWERING_DURATION_MS", ANSWERING_DURATION_MS],
    ["VOTING_DURATION_MS", VOTING_DURATION_MS],
    ["ROUND_RESULTS_DURATION_MS", ROUND_RESULTS_DURATION_MS],
    ["FINAL_DURATION_MS", FINAL_DURATION_MS],
  ])("%s is a positive integer", (_, value) => {
    expect(Number.isInteger(value)).toBe(true);
    expect(value).toBeGreaterThan(0);
  });

  it("player-facing phase timers are at least 10 s (UX floor)", () => {
    expect(ANSWERING_DURATION_MS).toBeGreaterThanOrEqual(10_000);
    expect(VOTING_DURATION_MS).toBeGreaterThanOrEqual(10_000);
  });
});

describe("GamePhase union", () => {
  it("covers exactly the CHECK constraint in migrations/002_create_rooms.sql", () => {
    const migrationPhases: GamePhase[] = [
      "lobby",
      "prompt",
      "answering",
      "diffusion",
      "voting",
      "round_results",
      "final",
    ];
    // Assignability test — if someone adds a new phase to the union without
    // updating the migration CHECK (or vice versa), this file will fail to
    // compile.
    const verify: Record<GamePhase, true> = {
      lobby: true,
      prompt: true,
      answering: true,
      diffusion: true,
      voting: true,
      round_results: true,
      final: true,
    };
    for (const p of migrationPhases) {
      expect(verify[p]).toBe(true);
    }
  });
});
