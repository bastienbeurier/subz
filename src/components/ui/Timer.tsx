"use client";

import { useEffect, useRef } from "react";
import { useTimer } from "@/hooks/useTimer";
import { cn } from "@/lib/utils/cn";
import { getVolume } from "@/lib/volume";

function playTickSound() {
  const vol = getVolume();
  if (vol === 0) return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.value = 1200;
    gain.gain.setValueAtTime(0.08 * vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.06);
    osc.onended = () => ctx.close();
  } catch {
    // AudioContext not available
  }
}

interface TimerProps {
  deadline: string | null;
  totalMs: number;
  onExpire?: () => void;
  className?: string;
  tickSound?: boolean;
}

export function Timer({ deadline, totalMs, onExpire, className, tickSound = false }: TimerProps) {
  const remainingMs = useTimer({ deadline, onExpire });
  const lastTickRef = useRef<number | null>(null);

  const clampedMs = remainingMs !== null ? Math.min(remainingMs, totalMs) : null;
  const seconds = clampedMs !== null ? Math.ceil(clampedMs / 1000) : null;
  const isUrgent = seconds !== null && seconds <= 10 && seconds > 0;

  useEffect(() => {
    if (!tickSound || !isUrgent || seconds === null) return;
    if (lastTickRef.current !== seconds) {
      lastTickRef.current = seconds;
      playTickSound();
    }
  }, [seconds, isUrgent, tickSound]);

  if (clampedMs === null) return null;

  const pct = Math.max(0, Math.min(1, clampedMs! / totalMs));

  // SVG ring
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg width="52" height="52" className="-rotate-90">
        {/* Track */}
        <circle
          cx="26"
          cy="26"
          r={radius}
          fill="none"
          stroke="white"
          strokeOpacity={0.1}
          strokeWidth="4"
        />
        {/* Progress */}
        <circle
          cx="26"
          cy="26"
          r={radius}
          fill="none"
          stroke="#FF3333"
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.1s linear, stroke 0.3s" }}
        />
      </svg>
      <span
        className={cn(
          "text-2xl font-black tabular-nums",
          "text-white"
        )}
      >
        {seconds}
      </span>
    </div>
  );
}
