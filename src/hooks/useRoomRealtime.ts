"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useGameStore } from "@/store/gameStore";
import type { Room, Player, Answer, Vote } from "@/types/game";

export function useRoomRealtime(roomId: string | null) {
  const supabaseRef = useRef(createClient());
  const {
    setRoom,
    upsertPlayer,
    upsertAnswer,
    addVote,
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
      // Player updates (score, is_ready, is_connected, is_kicked)
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
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
      setConnected(false);
    };
  }, [roomId, setRoom, upsertPlayer, upsertAnswer, addVote, setConnected]);
}
