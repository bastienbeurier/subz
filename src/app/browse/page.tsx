"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { savePlayerSession } from "@/hooks/usePlayerSession";
import { getDeviceToken } from "@/hooks/useDeviceToken";
import { useGameStore } from "@/store/gameStore";
import type { Room, Player } from "@/types/game";

interface RoomEntry {
  code: string;
  language: string;
  playerCount: number;
  maxPlayers: number;
}

const LANGUAGE_LABELS: Record<string, string> = {
  en: "🇬🇧 EN",
  fr: "🇫🇷 FR",
};

function BrowseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pseudo = searchParams.get("pseudo") ?? "";

  const { setRoom, setMyPlayer, setPlayers } = useGameStore();
  const [rooms, setRooms] = useState<RoomEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningCode, setJoiningCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/rooms/list");
      const data = await res.json();
      if (res.ok) {
        setRooms(data.rooms);
      } else {
        setError("Failed to load rooms");
      }
    } catch {
      setError("Failed to load rooms");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!pseudo) {
      router.replace("/");
      return;
    }
    fetchRooms();
    const interval = setInterval(fetchRooms, 3000);
    return () => clearInterval(interval);
  }, [pseudo, fetchRooms, router]);

  const joinRoom = async (code: string) => {
    setJoiningCode(code);
    setError(null);

    const res = await fetch("/api/rooms/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pseudo, code, deviceToken: getDeviceToken() }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Failed to join room");
      setJoiningCode(null);
      fetchRooms();
      return;
    }

    savePlayerSession(data.player.id, data.player.pseudo, data.room.code);
    setRoom(data.room as Room);
    setMyPlayer(data.player.id, data.player.pseudo);
    setPlayers([data.player as Player]);
    router.push(`/room/${data.room.code}`);
  };

  return (
    <main className="flex min-h-screen flex-col items-center gap-8 px-6 py-12 bg-[var(--background)]">
      <div className="w-full max-w-xs">
        <button
          onClick={() => router.back()}
          className="text-white/40 hover:text-white text-sm mb-6 transition-colors"
        >
          ← Back
        </button>

        <h1 className="text-3xl font-black text-white mb-1">Join a game</h1>
        <p className="text-white/40 text-sm mb-6">
          Playing as <span className="text-white/70 font-semibold">{pseudo}</span>
        </p>

        {error && (
          <p className="text-sm text-red-400 text-center mb-4">{error}</p>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/50">No open rooms right now.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {rooms.map((room) => {
              const isFull = room.playerCount >= room.maxPlayers;
              return (
                <div
                  key={room.code}
                  className={`flex items-center justify-between rounded-2xl px-4 py-3 ${isFull ? "bg-white/5" : "bg-white/10"}`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className={`font-bold text-lg tracking-wider ${isFull ? "text-white/30" : "text-white"}`}>
                      {room.code}
                    </span>
                    <div className="flex items-center gap-2 text-sm text-white/40">
                      <span className={isFull ? "text-red-400/60" : ""}>
                        {room.playerCount}/{room.maxPlayers} players
                      </span>
                      <span>·</span>
                      <span>{LANGUAGE_LABELS[room.language] ?? room.language.toUpperCase()}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    loading={joiningCode === room.code}
                    disabled={isFull || joiningCode !== null}
                    onClick={() => joinRoom(room.code)}
                  >
                    {isFull ? "Full" : "Join"}
                  </Button>
                </div>
              );
            })}

          </div>
        )}
      </div>
    </main>
  );
}

export default function BrowsePage() {
  return (
    <Suspense>
      <BrowseContent />
    </Suspense>
  );
}
