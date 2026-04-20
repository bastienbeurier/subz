export type GamePhase =
  | "lobby"
  | "prompt"
  | "answering"
  | "diffusion"
  | "voting"
  | "round_results"
  | "final";

export interface Room {
  id: string;
  code: string;
  phase: GamePhase;
  current_round: number;
  current_video_id: string | null;
  used_video_ids: string[];
  answering_deadline: string | null;
  voting_deadline: string | null;
  diffusion_index: number;
  auto_advance_at: string | null;
  last_activity_at: string;
  is_deleted: boolean;
  created_at: string;
}

export interface Player {
  id: string;
  room_id: string;
  pseudo: string;
  color: string;
  avatar_index: number;
  score: number;
  is_ready: boolean;
  is_connected: boolean;
  last_seen_at: string;
  joined_round: number;
  created_at: string;
}

export interface VideoSubtitle {
  id: string;
  video_id: string;
  start_ms: number;
  end_ms: number;
  text: string;
  created_at: string;
}

export interface Video {
  id: string;
  title: string;
  storage_path: string;
  public_url: string;
  duration_ms: number;
  subtitle_start_ms: number;
  subtitle_end_ms: number;
  is_active: boolean;
  created_at: string;
  subtitles?: VideoSubtitle[];
}

export interface ChatMessage {
  id: string;
  room_id: string;
  player_id: string | null;
  text: string;
  created_at: string;
}

export interface Answer {
  id: string;
  room_id: string;
  player_id: string;
  round: number;
  text: string;
  display_order: number | null;
  vote_count: number;
  created_at: string;
}

export interface Vote {
  id: string;
  room_id: string;
  round: number;
  voter_player_id: string;
  answer_id: string;
  created_at: string;
}

// Avatar color palette — index maps to Player.avatar_index
export const AVATAR_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
  "#F7DC6F",
] as const;

export const MAX_PLAYERS = 6;
export const TOTAL_ROUNDS = 5;
export const ANSWERING_DURATION_MS = 60_000;
export const VOTING_DURATION_MS = 60_000;
export const ROUND_RESULTS_DURATION_MS = 15_000;
export const FINAL_DURATION_MS = 20_000;
