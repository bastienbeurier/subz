"use client";

import { useEffect } from "react";

const HEARTBEAT_INTERVAL_MS = 3_000;

export function useHeartbeat(playerId: string | null, roomId: string | null) {
  useEffect(() => {
    if (!playerId || !roomId) return;

    const send = () => {
      fetch("/api/players/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, roomId }),
      }).catch(() => {
        // Silently ignore heartbeat failures — reconnect logic handles recovery
      });
    };

    send(); // immediate on mount
    const id = setInterval(send, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [playerId, roomId]);
}
