"use client";

import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { useShallow } from "zustand/react/shallow";
import { createClient } from "@/lib/supabase/client";
import type { ChatMessage } from "@/types/game";

interface ChatPanelProps {
  roomId: string;
}

export function ChatPanel({ roomId }: ChatPanelProps) {
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const players = useGameStore(useShallow((s) => s.players));
  const messages = useGameStore(useShallow((s) => s.messages));
  const setMessages = useGameStore((s) => s.setMessages);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent messages on mount
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("messages")
      .select()
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data }) => {
        if (data) setMessages(data as ChatMessage[]);
      });
  }, [roomId, setMessages]);

  // Auto-scroll when messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !myPlayerId || sending) return;
    setSending(true);
    setText("");
    await fetch("/api/game/send-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, playerId: myPlayerId, text: trimmed }),
    });
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getPlayer = (playerId: string | null) =>
    players.find((p) => p.id === playerId) ?? null;

  return (
    <div className="flex flex-col w-64 lg:w-72 border-l border-white/10 bg-black/20 h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/10 flex-shrink-0">
        <p className="text-white/50 text-xs uppercase tracking-widest font-bold">Chat</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
        {messages.length === 0 && (
          <p className="text-white/20 text-xs text-center mt-4">No messages yet</p>
        )}
        {messages.map((msg) => {
          const player = getPlayer(msg.player_id);
          const isMe = msg.player_id === myPlayerId;
          return (
            <div key={msg.id} className={`flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
              {player && (
                <span className="text-xs font-semibold" style={{ color: player.color }}>
                  {isMe ? "You" : player.pseudo}
                </span>
              )}
              <div
                className={`px-2.5 py-1.5 rounded-2xl text-sm max-w-[90%] break-words ${
                  isMe
                    ? "bg-violet-600 text-white rounded-br-sm"
                    : "bg-white/10 text-white rounded-bl-sm"
                }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-2 py-2 border-t border-white/10 flex-shrink-0 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={200}
          placeholder="Message…"
          className="flex-1 min-w-0 bg-white/10 text-white text-sm rounded-xl px-3 py-2 outline-none placeholder:text-white/30 focus:bg-white/15 transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="px-3 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:pointer-events-none text-white rounded-xl text-sm font-bold transition-colors"
        >
          ↑
        </button>
      </div>
    </div>
  );
}
