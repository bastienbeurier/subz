import { customAlphabet } from "nanoid";

// 6-character uppercase alphanumeric room codes (no ambiguous chars 0/O, 1/I/L)
const generate = customAlphabet("ABCDEFGHJKMNPQRSTUVWXYZ23456789", 6);

export function generateRoomCode(): string {
  return generate();
}
