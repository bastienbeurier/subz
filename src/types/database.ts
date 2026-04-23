// Hand-written until `supabase gen types typescript` can be run against a live project.
// Keep in sync with supabase/migrations/*.sql

import type { GamePhase } from "./game";

export type Database = {
  public: {
    Tables: {
      videos: {
        Row: {
          id: string;
          created_at: string;
          title: string;
          storage_path: string;
          public_url: string;
          duration_ms: number;
          subtitle_start_ms: number;
          subtitle_end_ms: number;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          title: string;
          storage_path: string;
          public_url: string;
          duration_ms: number;
          subtitle_start_ms: number;
          subtitle_end_ms: number;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          title?: string;
          storage_path?: string;
          public_url?: string;
          duration_ms?: number;
          subtitle_start_ms?: number;
          subtitle_end_ms?: number;
          is_active?: boolean;
        };
        Relationships: [];
      };
      rooms: {
        Row: {
          id: string;
          created_at: string;
          code: string;
          phase: GamePhase;
          creator_id: string | null;
          current_round: number;
          current_video_id: string | null;
          used_video_ids: string[];
          answering_deadline: string | null;
          voting_deadline: string | null;
          diffusion_index: number;
          auto_advance_at: string | null;
          last_activity_at: string;
          is_deleted: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          code: string;
          phase?: GamePhase;
          creator_id?: string | null;
          current_round?: number;
          current_video_id?: string | null;
          used_video_ids?: string[];
          answering_deadline?: string | null;
          voting_deadline?: string | null;
          diffusion_index?: number;
          auto_advance_at?: string | null;
          last_activity_at?: string;
          is_deleted?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          code?: string;
          phase?: GamePhase;
          creator_id?: string | null;
          current_round?: number;
          current_video_id?: string | null;
          used_video_ids?: string[];
          answering_deadline?: string | null;
          voting_deadline?: string | null;
          diffusion_index?: number;
          auto_advance_at?: string | null;
          last_activity_at?: string;
          is_deleted?: boolean;
        };
        Relationships: [];
      };
      players: {
        Row: {
          id: string;
          created_at: string;
          room_id: string;
          pseudo: string;
          color: string;
          avatar_index: number;
          score: number;
          is_ready: boolean;
          is_connected: boolean;
          last_seen_at: string;
          joined_round: number;
          device_token: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          room_id: string;
          pseudo: string;
          color: string;
          avatar_index: number;
          score?: number;
          is_ready?: boolean;
          is_connected?: boolean;
          last_seen_at?: string;
          joined_round?: number;
          device_token?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          room_id?: string;
          pseudo?: string;
          color?: string;
          avatar_index?: number;
          score?: number;
          is_ready?: boolean;
          is_connected?: boolean;
          last_seen_at?: string;
          joined_round?: number;
          device_token?: string | null;
        };
        Relationships: [];
      };
      room_bans: {
        Row: {
          id: string;
          created_at: string;
          room_id: string;
          device_token: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          room_id: string;
          device_token: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          room_id?: string;
          device_token?: string;
        };
        Relationships: [];
      };
      answers: {
        Row: {
          id: string;
          created_at: string;
          room_id: string;
          player_id: string;
          round: number;
          text: string;
          display_order: number | null;
          vote_count: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          room_id: string;
          player_id: string;
          round: number;
          text: string;
          display_order?: number | null;
          vote_count?: number;
        };
        Update: {
          id?: string;
          created_at?: string;
          room_id?: string;
          player_id?: string;
          round?: number;
          text?: string;
          display_order?: number | null;
          vote_count?: number;
        };
        Relationships: [];
      };
      votes: {
        Row: {
          id: string;
          created_at: string;
          room_id: string;
          round: number;
          voter_player_id: string;
          answer_id: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          room_id: string;
          round: number;
          voter_player_id: string;
          answer_id: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          room_id?: string;
          round?: number;
          voter_player_id?: string;
          answer_id?: string;
        };
        Relationships: [];
      };
      video_subtitles: {
        Row: {
          id: string;
          created_at: string;
          video_id: string;
          start_ms: number;
          end_ms: number;
          text: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          video_id: string;
          start_ms: number;
          end_ms: number;
          text: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          video_id?: string;
          start_ms?: number;
          end_ms?: number;
          text?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          created_at: string;
          room_id: string;
          player_id: string | null;
          text: string;
          type: "chat" | "kick_vote" | "kick";
        };
        Insert: {
          id?: string;
          created_at?: string;
          room_id: string;
          player_id?: string | null;
          text: string;
          type?: "chat" | "kick_vote" | "kick";
        };
        Update: {
          id?: string;
          created_at?: string;
          room_id?: string;
          player_id?: string | null;
          text?: string;
          type?: "chat" | "kick_vote" | "kick";
        };
        Relationships: [];
      };
      vote_kicks: {
        Row: {
          id: string;
          created_at: string;
          room_id: string;
          voter_player_id: string;
          target_player_id: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          room_id: string;
          voter_player_id: string;
          target_player_id: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          room_id?: string;
          voter_player_id?: string;
          target_player_id?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      game_phase: GamePhase;
    };
  };
};
