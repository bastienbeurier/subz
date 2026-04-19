// Hand-written until `supabase gen types typescript` can be run against a live project.
// Keep in sync with supabase/migrations/*.sql

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
          phase: string;
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
          phase?: string;
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
          phase?: string;
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
          is_kicked: boolean;
          last_seen_at: string;
          joined_round: number;
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
          is_kicked?: boolean;
          last_seen_at?: string;
          joined_round?: number;
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
          is_kicked?: boolean;
          last_seen_at?: string;
          joined_round?: number;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
