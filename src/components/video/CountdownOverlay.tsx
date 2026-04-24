"use client";

import { useEffect, useState } from "react";
import { getVolume } from "@/lib/volume";

function playTick(isGo: boolean) {
  const vol = getVolume();
  if (vol === 0) return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = isGo ? 880 : 660;
    gain.gain.setValueAtTime(0.15 * vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (isGo ? 0.25 : 0.12));
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + (isGo ? 0.25 : 0.12));
    osc.onended = () => ctx.close();
  } catch {
    // AudioContext not available
  }
}

interface CountdownOverlayProps {
  onComplete: () => void;
}

export function CountdownOverlay({ onComplete }: CountdownOverlayProps) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    playTick(count === 0);
    if (count === 0) {
      const t = setTimeout(() => onComplete(), 700);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCount((c) => c - 1), 900);
    return () => clearTimeout(t);
  }, [count, onComplete]);

  return (
    <div
      className="relative w-full bg-black flex items-center justify-center"
      style={{ aspectRatio: "16/9" }}
    >
      <div
        key={count}
        className="flex flex-col items-center gap-2 animate-pulse"
        style={{ animation: "countdown-pop 0.25s ease-out" }}
      >
        <span
          className="font-bold text-white tabular-nums select-none"
          style={{ fontSize: "clamp(4rem, 12vw, 8rem)", lineHeight: 1 }}
        >
          {count === 0 ? "Go!" : count}
        </span>
      </div>
      <style>{`
        @keyframes countdown-pop {
          0% { transform: scale(1.4); opacity: 0.4; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
