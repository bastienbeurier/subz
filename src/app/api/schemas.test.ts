// Contract tests for the Zod schemas used by each API route.
//
// The schemas below are intentionally duplicated from the route files so the
// tests can run without importing server-only modules (Next request/response
// types, service clients, etc.). If you change a schema in a route, mirror it
// here — these tests double as a machine-readable spec of the accepted shape.
//
// Covered routes:
//   - POST /api/rooms/create        (pseudo)
//   - POST /api/rooms/join          (pseudo + code)
//   - POST /api/rooms/random        (pseudo)
//   - POST /api/players/ready       (playerId, roomId, ready?)
//   - POST /api/players/heartbeat   (playerId, roomId)
//   - POST /api/players/reconnect   (playerId, roomCode)
//   - POST /api/game/advance-phase  (roomId, expectedPhase)
//   - POST /api/game/submit-answer  (roomId, playerId, text, round)
//   - POST /api/game/submit-vote    (roomId, voterId, answerId, round)

import { describe, it, expect } from "vitest";
import { z } from "zod";

const PSEUDO = z
  .string()
  .min(1)
  .max(16)
  .regex(/^[a-zA-Z0-9 _-]+$/);

const UUID = z.string().uuid();

const UUID_EXAMPLE = "6d9e3a0f-3a7a-4f2e-9c22-6b16c2b54b3c";
const UUID_EXAMPLE_2 = "2c27cc88-f7bc-40a7-9a8a-e3a8c4a9e111";

describe("pseudo validation (create / join / random)", () => {
  const schema = z.object({ pseudo: PSEUDO });

  it.each([
    ["a"],
    ["Alice"],
    ["Jean-Luc"],
    ["Captain_Kirk"],
    ["user 42"],
    ["ABCDEFGHIJKLMNOP"], // exactly 16
    ["x"],
  ])("accepts %p", (pseudo) => {
    expect(schema.safeParse({ pseudo }).success).toBe(true);
  });

  it.each([
    [""], // min 1
    ["ABCDEFGHIJKLMNOPQ"], // 17 chars, over max
    ["hey!"], // invalid punctuation
    ["emoji 🎉"], // non-ASCII
    ["angle<bracket>"], // disallowed
    ["semi;colon"],
    ["\t"],
    [" "], // single space — is actually allowed by regex; but min(1) passes too
  ])("rejects %p (except single space which regex accepts)", (pseudo) => {
    const result = schema.safeParse({ pseudo });
    if (pseudo === " ") {
      // Documented gotcha: a lone space passes both min(1) and the regex.
      // The UI should trim before submit.
      expect(result.success).toBe(true);
    } else {
      expect(result.success).toBe(false);
    }
  });
});

describe("room join schema", () => {
  const schema = z.object({ pseudo: PSEUDO, code: z.string().length(6) });

  it("requires code to be exactly 6 characters", () => {
    expect(schema.safeParse({ pseudo: "a", code: "ABC23" }).success).toBe(false);
    expect(schema.safeParse({ pseudo: "a", code: "ABC2345" }).success).toBe(false);
    expect(schema.safeParse({ pseudo: "a", code: "ABC234" }).success).toBe(true);
  });

  it("does not validate the room-code alphabet (server lowercases then looks up)", () => {
    // The route uppercases the code and queries by code; invalid alphabet
    // simply won't match any row. Schema stays permissive by design.
    expect(schema.safeParse({ pseudo: "a", code: "abc234" }).success).toBe(true);
    expect(schema.safeParse({ pseudo: "a", code: "000000" }).success).toBe(true);
  });
});

describe("players/ready schema", () => {
  const schema = z.object({
    playerId: UUID,
    roomId: UUID,
    ready: z.boolean().optional().default(true),
  });

  it("defaults ready=true when omitted", () => {
    const parsed = schema.parse({ playerId: UUID_EXAMPLE, roomId: UUID_EXAMPLE_2 });
    expect(parsed.ready).toBe(true);
  });

  it("accepts ready=false for the unready toggle", () => {
    const parsed = schema.parse({
      playerId: UUID_EXAMPLE,
      roomId: UUID_EXAMPLE_2,
      ready: false,
    });
    expect(parsed.ready).toBe(false);
  });

  it("rejects non-uuid ids", () => {
    expect(
      schema.safeParse({ playerId: "not-a-uuid", roomId: UUID_EXAMPLE_2 }).success
    ).toBe(false);
  });
});

describe("players/heartbeat schema", () => {
  const schema = z.object({ playerId: UUID, roomId: UUID });

  it("requires both fields", () => {
    expect(schema.safeParse({ playerId: UUID_EXAMPLE }).success).toBe(false);
    expect(schema.safeParse({ roomId: UUID_EXAMPLE }).success).toBe(false);
    expect(
      schema.safeParse({ playerId: UUID_EXAMPLE, roomId: UUID_EXAMPLE_2 }).success
    ).toBe(true);
  });
});

describe("players/reconnect schema", () => {
  const schema = z.object({ playerId: UUID, roomCode: z.string().min(1) });

  it("accepts any non-empty room code (server normalizes to uppercase)", () => {
    expect(
      schema.safeParse({ playerId: UUID_EXAMPLE, roomCode: "abc234" }).success
    ).toBe(true);
  });

  it("rejects empty room code", () => {
    expect(
      schema.safeParse({ playerId: UUID_EXAMPLE, roomCode: "" }).success
    ).toBe(false);
  });
});

describe("game/advance-phase schema", () => {
  const schema = z.object({ roomId: UUID, expectedPhase: z.string() });

  it("accepts any string for expectedPhase (route switch rejects unknown)", () => {
    const result = schema.safeParse({
      roomId: UUID_EXAMPLE,
      expectedPhase: "banana",
    });
    expect(result.success).toBe(true);
  });

  it("rejects when expectedPhase is missing", () => {
    expect(schema.safeParse({ roomId: UUID_EXAMPLE }).success).toBe(false);
  });
});

describe("game/submit-answer schema", () => {
  const schema = z.object({
    roomId: UUID,
    playerId: UUID,
    text: z.string().min(1).max(120),
    round: z.number().int().min(1),
  });

  it("accepts a typical answer", () => {
    expect(
      schema.safeParse({
        roomId: UUID_EXAMPLE,
        playerId: UUID_EXAMPLE_2,
        text: "I can't believe it's not butter",
        round: 1,
      }).success
    ).toBe(true);
  });

  it("enforces min(1) / max(120) on text", () => {
    expect(
      schema.safeParse({
        roomId: UUID_EXAMPLE,
        playerId: UUID_EXAMPLE_2,
        text: "",
        round: 1,
      }).success
    ).toBe(false);
    expect(
      schema.safeParse({
        roomId: UUID_EXAMPLE,
        playerId: UUID_EXAMPLE_2,
        text: "a".repeat(120),
        round: 1,
      }).success
    ).toBe(true);
    expect(
      schema.safeParse({
        roomId: UUID_EXAMPLE,
        playerId: UUID_EXAMPLE_2,
        text: "a".repeat(121),
        round: 1,
      }).success
    ).toBe(false);
  });

  it("requires round >= 1 (0 means pre-game)", () => {
    expect(
      schema.safeParse({
        roomId: UUID_EXAMPLE,
        playerId: UUID_EXAMPLE_2,
        text: "x",
        round: 0,
      }).success
    ).toBe(false);
  });

  it("rejects non-integer round", () => {
    expect(
      schema.safeParse({
        roomId: UUID_EXAMPLE,
        playerId: UUID_EXAMPLE_2,
        text: "x",
        round: 1.5,
      }).success
    ).toBe(false);
  });
});

describe("game/submit-vote schema", () => {
  const schema = z.object({
    roomId: UUID,
    voterId: UUID,
    answerId: UUID,
    round: z.number().int().min(1),
  });

  it("accepts a valid vote payload", () => {
    expect(
      schema.safeParse({
        roomId: UUID_EXAMPLE,
        voterId: UUID_EXAMPLE_2,
        answerId: UUID_EXAMPLE,
        round: 3,
      }).success
    ).toBe(true);
  });

  it("rejects round=0 (no votes in pre-game)", () => {
    expect(
      schema.safeParse({
        roomId: UUID_EXAMPLE,
        voterId: UUID_EXAMPLE_2,
        answerId: UUID_EXAMPLE,
        round: 0,
      }).success
    ).toBe(false);
  });

  it("rejects when any uuid is malformed", () => {
    expect(
      schema.safeParse({
        roomId: "nope",
        voterId: UUID_EXAMPLE,
        answerId: UUID_EXAMPLE_2,
        round: 1,
      }).success
    ).toBe(false);
  });
});
