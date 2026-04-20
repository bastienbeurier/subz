"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useGameStore } from "@/store/gameStore";
import type { Room, Player, Answer, Vote, ChatMessage } from "@/types/game";

export function useRoomRealtime(roomId: string | null) {
  const supabaseRef = useRef(createClient());
  const {
    setRoom,
    upsertPlayer,
    removePlayer,
    upsertAnswer,
    removeAnswer,
    addVote,
    removeVote,
    addMessage,
    setConnected,
  } = useGameStore();

  useEffect(() => {
    if (!roomId) return;

    const supabase = supabaseRef.current;
    setConnected(false);

    const channel = supabase
      .channel(`room:${roomId}`)
      // Room changes (phase, deadlines, round)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          setRoom(payload.new as Room);
        }
      )
      // Player inserts (new player joined)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          upsertPlayer(payload.new as Player);
        }
      )
      // Player updates (score, is_ready, is_connected)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          upsertPlayer(payload.new as Player);
        }
      )
      // Player deletes (fired during final→lobby cleanup for disconnected
      // players). Requires REPLICA IDENTITY FULL on players (migration 011)
      // so the room_id filter can match.
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const old = payload.old as { id?: string } | undefined;
          if (old?.id) removePlayer(old.id);
        }
      )
      // Answer inserts
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "answers",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          upsertAnswer(payload.new as Answer);
        }
      )
      // Answer updates (display_order set at diffusion start, vote_count via trigger)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "answers",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          upsertAnswer(payload.new as Answer);
        }
      )
      // Answer deletes (fired during final→lobby cleanup)
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "answers",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const old = payload.old as { id?: string } | undefined;
          if (old?.id) removeAnswer(old.id);
        }
      )
      // Vote inserts
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "votes",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          addVote(payload.new as Vote);
        }
      )
      // Vote deletes (fired during final→lobby cleanup, and transiently when
      // a voter swaps their pick — see submit-vote route).
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "votes",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const old = payload.old as { id?: string } | undefined;
          if (old?.id) removeVote(old.id);
        }
      )
      // Chat messages
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          addMessage(payload.new as ChatMessage);
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
      setConnected(false);
    };
  }, [
    roomId,
    setRoom,
    upsertPlayer,
    removePlayer,
    upsertAnswer,
    removeAnswer,
    addVote,
    removeVote,
    addMessage,
    setConnected,
  ]);
}
