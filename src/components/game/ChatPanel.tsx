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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const seenCountRef = useRef(0);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("messages")
      .select()
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data }) => {
        if (data) {
          setMessages(data as ChatMessage[]);
          seenCountRef.current = data.length;
        }
      });
  }, [roomId, setMessages]);

  // Track unread when mobile drawer is closed
  useEffect(() => {
    if (!isMobile || mobileOpen) {
      seenCountRef.current = messages.length;
      setUnread(0);
    } else {
      setUnread(Math.max(0, messages.length - seenCountRef.current));
    }
  }, [messages.length, mobileOpen, isMobile]);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when drawer opens
  useEffect(() => {
    if (mobileOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(t);
    }
  }, [mobileOpen]);

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

  const messagesFeed = (
    <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0 overscroll-contain">
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
  );

  const inputBar = (
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
  );

  if (isMobile) {
    return (
      <>
        {/* Floating chat button */}
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed bottom-5 right-4 z-40 w-12 h-12 rounded-full bg-violet-600 shadow-xl flex items-center justify-center"
          aria-label="Open chat"
        >
          <ChatBubbleIcon />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white px-1">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>

        {/* Backdrop */}
        <div
          className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 touch-none ${
            mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          onClick={() => setMobileOpen(false)}
        />

        {/* Slide-up drawer */}
        <div
          className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-[var(--background)] border-t border-white/10 rounded-t-2xl transition-transform duration-300 ease-out"
          style={{
            height: "65dvh",
            transform: mobileOpen ? "translateY(0)" : "translateY(100%)",
          }}
        >
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between flex-shrink-0">
            <p className="text-white/50 text-xs uppercase tracking-widest font-bold">Chat</p>
            <button
              onClick={() => setMobileOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors text-sm"
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>
          {messagesFeed}
          {inputBar}
        </div>
      </>
    );
  }

  // Desktop: side panel
  return (
    <div className="flex flex-col w-64 lg:w-72 border-l border-white/10 bg-black/20 h-full">
      <div className="px-3 py-2 border-b border-white/10 flex-shrink-0">
        <p className="text-white/50 text-xs uppercase tracking-widest font-bold">Chat</p>
      </div>
      {messagesFeed}
      {inputBar}
    </div>
  );
}

function ChatBubbleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
