"use client";

import { useEffect, useState } from "react";

const SESSION_KEY = "subz_player";

interface PlayerSession {
  playerId: string;
  pseudo: string;
  roomCode: string;
}

export function savePlayerSession(
  playerId: string,
  pseudo: string,
  roomCode: string
) {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ playerId, pseudo, roomCode })
  );
}

export function loadPlayerSession(): PlayerSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PlayerSession;
  } catch {
    return null;
  }
}

export function clearPlayerSession() {
  localStorage.removeItem(SESSION_KEY);
}

// React hook — returns null on server, actual value after hydration
export function usePlayerSession(): PlayerSession | null {
  const [session, setSession] = useState<PlayerSession | null>(null);

  useEffect(() => {
    setSession(loadPlayerSession());
  }, []);

  return session;
}
