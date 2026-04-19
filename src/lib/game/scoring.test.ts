import { describe, it, expect } from "vitest";
import { calculateRoundScores } from "./scoring";
import { makeAnswer } from "@/test/fixtures";

describe("calculateRoundScores", () => {
  it("returns an empty map when there are no answers", () => {
    expect(calculateRoundScores([])).toEqual(new Map());
  });

  it("awards +1 per vote received", () => {
    const answers = [
      makeAnswer({ player_id: "p1", vote_count: 2 }),
      makeAnswer({ player_id: "p2", vote_count: 1 }),
      makeAnswer({ player_id: "p3", vote_count: 0 }),
    ];
    const scores = calculateRoundScores(answers);
    expect(scores.get("p1")).toBe(2);
    expect(scores.get("p2")).toBe(1);
    expect(scores.get("p3")).toBe(0);
  });

  it("awards clean-sweep +2 bonus when one answer gets every vote and ≥2 voters", () => {
    const answers = [
      makeAnswer({ player_id: "p1", vote_count: 3 }),
      makeAnswer({ player_id: "p2", vote_count: 0 }),
      makeAnswer({ player_id: "p3", vote_count: 0 }),
    ];
    const scores = calculateRoundScores(answers);
    expect(scores.get("p1")).toBe(3 + 2);
    expect(scores.get("p2")).toBe(0);
    expect(scores.get("p3")).toBe(0);
  });

  it("does NOT award sweep bonus with only 1 voter (trivial sweep)", () => {
    const answers = [
      makeAnswer({ player_id: "p1", vote_count: 1 }),
      makeAnswer({ player_id: "p2", vote_count: 0 }),
    ];
    const scores = calculateRoundScores(answers);
    expect(scores.get("p1")).toBe(1); // no +2
    expect(scores.get("p2")).toBe(0);
  });

  it("does NOT award sweep bonus when votes are split", () => {
    const answers = [
      makeAnswer({ player_id: "p1", vote_count: 2 }),
      makeAnswer({ player_id: "p2", vote_count: 1 }),
    ];
    const scores = calculateRoundScores(answers);
    expect(scores.get("p1")).toBe(2);
    expect(scores.get("p2")).toBe(1);
  });

  it("does NOT award sweep when the 'sweep' answer has 0 votes (all abstained)", () => {
    const answers = [
      makeAnswer({ player_id: "p1", vote_count: 0 }),
      makeAnswer({ player_id: "p2", vote_count: 0 }),
    ];
    const scores = calculateRoundScores(answers);
    expect(scores.get("p1")).toBe(0);
    expect(scores.get("p2")).toBe(0);
  });

  it("handles exactly 2 votes all on one answer as a sweep", () => {
    const answers = [
      makeAnswer({ player_id: "p1", vote_count: 2 }),
      makeAnswer({ player_id: "p2", vote_count: 0 }),
    ];
    const scores = calculateRoundScores(answers);
    expect(scores.get("p1")).toBe(2 + 2);
  });

  it("produces one entry per answer, even when multiple answers from different players tie", () => {
    const answers = [
      makeAnswer({ player_id: "p1", vote_count: 1 }),
      makeAnswer({ player_id: "p2", vote_count: 1 }),
      makeAnswer({ player_id: "p3", vote_count: 1 }),
    ];
    const scores = calculateRoundScores(answers);
    expect(scores.size).toBe(3);
    expect(scores.get("p1")).toBe(1);
    expect(scores.get("p2")).toBe(1);
    expect(scores.get("p3")).toBe(1);
  });
});
