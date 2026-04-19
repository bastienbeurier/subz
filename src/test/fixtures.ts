import type { Answer, Player, Room, Vote } from "@/types/game";

let seq = 0;
const uid = (prefix: string) => `${prefix}-${++seq}`;

export function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: uid("room"),
    code: "ABC234",
    phase: "lobby",
    current_round: 0,
    current_video_id: null,
    used_video_ids: [],
    answering_deadline: null,
    voting_deadline: null,
    diffusion_index: 0,
    auto_advance_at: null,
    last_activity_at: new Date().toISOString(),
    is_deleted: false,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: uid("player"),
    room_id: "room-1",
    pseudo: "Alice",
    color: "#FF6B6B",
    avatar_index: 0,
    score: 0,
    is_ready: false,
    is_connected: true,
    last_seen_at: new Date().toISOString(),
    joined_round: 0,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function makeAnswer(overrides: Partial<Answer> = {}): Answer {
  return {
    id: uid("answer"),
    room_id: "room-1",
    player_id: "player-1",
    round: 1,
    text: "something funny",
    display_order: 0,
    vote_count: 0,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function makeVote(overrides: Partial<Vote> = {}): Vote {
  return {
    id: uid("vote"),
    room_id: "room-1",
    round: 1,
    voter_player_id: "player-1",
    answer_id: "answer-1",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}
