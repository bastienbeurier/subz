import { describe, it, expect } from "vitest";
import { generateRoomCode } from "./roomCode";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

describe("generateRoomCode", () => {
  it("returns a 6-character string", () => {
    expect(generateRoomCode()).toHaveLength(6);
  });

  it("uses only the intended alphabet (no 0/1/I/L/O)", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateRoomCode();
      for (const ch of code) {
        expect(ALPHABET).toContain(ch);
      }
    }
  });

  it("does not contain the ambiguous characters 0, 1, I, L, O", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateRoomCode();
      expect(code).not.toMatch(/[01ILO]/);
    }
  });

  it("produces distinct codes across many invocations (collision-rare)", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 1000; i++) codes.add(generateRoomCode());
    // With a 31-char alphabet and 6 chars, 31^6 ≈ 887M — 1000 samples should be
    // effectively unique. Tolerate ≥ 990 to stay non-flaky.
    expect(codes.size).toBeGreaterThanOrEqual(990);
  });
});
