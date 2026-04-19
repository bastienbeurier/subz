import type { Player, Room } from "./game";

// POST /api/rooms/create
export interface CreateRoomRequest {
  pseudo: string;
}
export interface CreateRoomResponse {
  room: Room;
  player: Player;
}

// POST /api/rooms/join
export interface JoinRoomRequest {
  code: string;
  pseudo: string;
}
export interface JoinRoomResponse {
  room: Room;
  player: Player;
}

// POST /api/rooms/random
export interface JoinRandomRoomRequest {
  pseudo: string;
}
export interface JoinRandomRoomResponse {
  room: Room;
  player: Player;
}

// POST /api/players/ready
export interface SetReadyRequest {
  playerId: string;
  roomId: string;
}

// POST /api/players/heartbeat
export interface HeartbeatRequest {
  playerId: string;
  roomId: string;
}

// POST /api/players/reconnect
export interface ReconnectRequest {
  playerId: string;
  roomCode: string;
}
export interface ReconnectResponse {
  room: Room;
  player: Player;
}

// POST /api/game/advance-phase
export interface AdvancePhaseRequest {
  roomId: string;
  expectedPhase: string;
}

// POST /api/game/submit-answer
export interface SubmitAnswerRequest {
  roomId: string;
  playerId: string;
  text: string;
  round: number;
}

// POST /api/game/next-diffusion
export interface NextDiffusionRequest {
  roomId: string;
  currentIndex: number;
}

// POST /api/game/submit-vote
export interface SubmitVoteRequest {
  roomId: string;
  voterId: string;
  answerId: string;
  round: number;
}

export interface ApiError {
  error: string;
}
