import { describe, it, expect, beforeEach } from "vitest";
import {
  useGameStore,
  selectMyPlayer,
  selectConnectedPlayers,
  selectActivePlayersThisRound,
  selectCurrentAnswers,
  selectCurrentVotes,
  selectSortedPlayers,
} from "./gameStore";
import { makeAnswer, makePlayer, makeRoom, makeVote } from "@/test/fixtures";

// Reset Zustand store between tests.
beforeEach(() => {
  useGameStore.getState().reset();
});

describe("gameStore actions", () => {
  it("setRoom replaces the room", () => {
    const room = makeRoom({ phase: "prompt", current_round: 1 });
    useGameStore.getState().setRoom(room);
    expect(useGameStore.getState().room).toEqual(room);
  });

  it("upsertPlayer inserts then updates in-place", () => {
    const p1 = makePlayer({ id: "p1", score: 0 });
    useGameStore.getState().upsertPlayer(p1);
    expect(useGameStore.getState().players).toHaveLength(1);

    useGameStore.getState().upsertPlayer({ ...p1, score: 5 });
    expect(useGameStore.getState().players).toHaveLength(1);
    expect(useGameStore.getState().players[0].score).toBe(5);
  });

  it("removePlayer deletes by id", () => {
    useGameStore.getState().upsertPlayer(makePlayer({ id: "p1" }));
    useGameStore.getState().upsertPlayer(makePlayer({ id: "p2" }));
    useGameStore.getState().removePlayer("p1");
    expect(useGameStore.getState().players.map((p) => p.id)).toEqual(["p2"]);
  });

  it("addAnswer is deduplicated by id; upsertAnswer replaces", () => {
    const a = makeAnswer({ id: "a1", text: "one" });
    useGameStore.getState().addAnswer(a);
    useGameStore.getState().addAnswer(a); // dedupe
    expect(useGameStore.getState().answers).toHaveLength(1);

    useGameStore.getState().upsertAnswer({ ...a, text: "two" });
    expect(useGameStore.getState().answers[0].text).toBe("two");
  });

  it("addVote is deduplicated by id", () => {
    const v = makeVote({ id: "v1" });
    useGameStore.getState().addVote(v);
    useGameStore.getState().addVote(v);
    expect(useGameStore.getState().votes).toHaveLength(1);
  });

  it("removeAnswer deletes by id (used by realtime DELETE handler)", () => {
    useGameStore.getState().upsertAnswer(makeAnswer({ id: "a1" }));
    useGameStore.getState().upsertAnswer(makeAnswer({ id: "a2" }));
    useGameStore.getState().removeAnswer("a1");
    expect(useGameStore.getState().answers.map((a) => a.id)).toEqual(["a2"]);
  });

  it("removeAnswer on an unknown id is a no-op", () => {
    useGameStore.getState().upsertAnswer(makeAnswer({ id: "a1" }));
    useGameStore.getState().removeAnswer("nope");
    expect(useGameStore.getState().answers).toHaveLength(1);
  });

  it("removeVote deletes by id (used by realtime DELETE handler)", () => {
    useGameStore.getState().addVote(makeVote({ id: "v1" }));
    useGameStore.getState().addVote(makeVote({ id: "v2" }));
    useGameStore.getState().removeVote("v1");
    expect(useGameStore.getState().votes.map((v) => v.id)).toEqual(["v2"]);
  });

  it("reset restores all slices to initial values", () => {
    useGameStore.getState().setRoom(makeRoom());
    useGameStore.getState().upsertPlayer(makePlayer());
    useGameStore.getState().setMyPlayer("p1", "Alice");
    useGameStore.getState().setSubmitted(true);
    useGameStore.getState().setVoted(true);
    useGameStore.getState().setConnected(true);

    useGameStore.getState().reset();

    const s = useGameStore.getState();
    expect(s.room).toBeNull();
    expect(s.players).toEqual([]);
    expect(s.answers).toEqual([]);
    expect(s.votes).toEqual([]);
    expect(s.myPlayerId).toBeNull();
    expect(s.myPseudo).toBeNull();
    expect(s.hasSubmittedAnswer).toBe(false);
    expect(s.hasVoted).toBe(false);
    expect(s.isConnected).toBe(false);
  });
});

describe("selectMyPlayer", () => {
  it("returns null when no myPlayerId set", () => {
    useGameStore.getState().upsertPlayer(makePlayer({ id: "p1" }));
    expect(selectMyPlayer(useGameStore.getState())).toBeNull();
  });

  it("returns the player whose id matches myPlayerId", () => {
    useGameStore.getState().upsertPlayer(makePlayer({ id: "p1" }));
    useGameStore.getState().upsertPlayer(makePlayer({ id: "p2", pseudo: "Me" }));
    useGameStore.getState().setMyPlayer("p2", "Me");
    expect(selectMyPlayer(useGameStore.getState())?.pseudo).toBe("Me");
  });

  it("returns null when myPlayerId points to a removed player", () => {
    useGameStore.getState().upsertPlayer(makePlayer({ id: "p1" }));
    useGameStore.getState().setMyPlayer("ghost", "Phantom");
    expect(selectMyPlayer(useGameStore.getState())).toBeNull();
  });
});

describe("selectConnectedPlayers", () => {
  it("excludes disconnected players", () => {
    useGameStore.getState().upsertPlayer(makePlayer({ id: "p1", is_connected: true }));
    useGameStore.getState().upsertPlayer(makePlayer({ id: "p2", is_connected: false }));
    const result = selectConnectedPlayers(useGameStore.getState());
    expect(result.map((p) => p.id)).toEqual(["p1"]);
  });
});

describe("selectActivePlayersThisRound", () => {
  it("excludes mid-round joiners (joined_round === current_round)", () => {
    useGameStore.getState().setRoom(makeRoom({ current_round: 2 }));
    useGameStore.getState().upsertPlayer(makePlayer({ id: "early", joined_round: 0 }));
    useGameStore.getState().upsertPlayer(makePlayer({ id: "joinedR1", joined_round: 1 }));
    useGameStore.getState().upsertPlayer(makePlayer({ id: "joinedR2", joined_round: 2 }));

    const ids = selectActivePlayersThisRound(useGameStore.getState()).map((p) => p.id);
    expect(ids).toEqual(["early", "joinedR1"]);
  });

  it("excludes disconnected regardless of joined_round", () => {
    useGameStore.getState().setRoom(makeRoom({ current_round: 1 }));
    useGameStore.getState().upsertPlayer(makePlayer({ id: "active", joined_round: 0 }));
    useGameStore.getState().upsertPlayer(makePlayer({ id: "gone", joined_round: 0, is_connected: false }));
    const ids = selectActivePlayersThisRound(useGameStore.getState()).map((p) => p.id);
    expect(ids).toEqual(["active"]);
  });

  it("returns an empty list when room is null (round defaults to 0, joined_round < 0 impossible)", () => {
    useGameStore.getState().upsertPlayer(makePlayer({ joined_round: 0 }));
    expect(selectActivePlayersThisRound(useGameStore.getState())).toEqual([]);
  });
});

describe("selectCurrentAnswers", () => {
  it("filters by current round and sorts by display_order", () => {
    useGameStore.getState().setRoom(makeRoom({ current_round: 2 }));
    useGameStore.getState().upsertAnswer(makeAnswer({ id: "a1", round: 2, display_order: 2 }));
    useGameStore.getState().upsertAnswer(makeAnswer({ id: "a2", round: 2, display_order: 0 }));
    useGameStore.getState().upsertAnswer(makeAnswer({ id: "a3", round: 2, display_order: 1 }));
    useGameStore.getState().upsertAnswer(makeAnswer({ id: "aPrev", round: 1, display_order: 0 }));

    const ids = selectCurrentAnswers(useGameStore.getState()).map((a) => a.id);
    expect(ids).toEqual(["a2", "a3", "a1"]);
  });

  it("treats null display_order as 0 (stable when all null)", () => {
    useGameStore.getState().setRoom(makeRoom({ current_round: 1 }));
    useGameStore.getState().upsertAnswer(makeAnswer({ id: "a1", round: 1, display_order: null }));
    useGameStore.getState().upsertAnswer(makeAnswer({ id: "a2", round: 1, display_order: null }));
    const out = selectCurrentAnswers(useGameStore.getState());
    expect(out.map((a) => a.id).sort()).toEqual(["a1", "a2"]);
  });
});

describe("selectCurrentVotes", () => {
  it("filters by current round only", () => {
    useGameStore.getState().setRoom(makeRoom({ current_round: 2 }));
    useGameStore.getState().addVote(makeVote({ id: "v1", round: 2 }));
    useGameStore.getState().addVote(makeVote({ id: "v2", round: 1 }));
    const ids = selectCurrentVotes(useGameStore.getState()).map((v) => v.id);
    expect(ids).toEqual(["v1"]);
  });
});

describe("selectSortedPlayers", () => {
  it("sorts by score desc", () => {
    useGameStore.getState().upsertPlayer(makePlayer({ id: "a", score: 2 }));
    useGameStore.getState().upsertPlayer(makePlayer({ id: "b", score: 7 }));
    useGameStore.getState().upsertPlayer(makePlayer({ id: "d", score: 0 }));
    const ids = selectSortedPlayers(useGameStore.getState()).map((p) => p.id);
    expect(ids).toEqual(["b", "a", "d"]);
  });

  it("does not mutate the underlying array", () => {
    useGameStore.getState().upsertPlayer(makePlayer({ id: "a", score: 1 }));
    useGameStore.getState().upsertPlayer(makePlayer({ id: "b", score: 3 }));
    selectSortedPlayers(useGameStore.getState());
    const raw = useGameStore.getState().players.map((p) => p.id);
    expect(raw).toEqual(["a", "b"]); // insertion order preserved
  });
});
