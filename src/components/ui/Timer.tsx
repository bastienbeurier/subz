"use client";

import { useTimer } from "@/hooks/useTimer";
import { cn } from "@/lib/utils/cn";

interface TimerProps {
  deadline: string | null;
  totalMs: number;
  onExpire?: () => void;
  className?: string;
}

export function Timer({ deadline, totalMs, onExpire, className }: TimerProps) {
  const remainingMs = useTimer({ deadline, onExpire });

  if (remainingMs === null) return null;

  const pct = Math.max(0, Math.min(1, remainingMs / totalMs));
  const seconds = Math.ceil(remainingMs / 1000);
  const isUrgent = seconds <= 10;

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
          stroke={isUrgent ? "#f87171" : "#a855f7"}
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
          isUrgent ? "text-red-400" : "text-white"
        )}
      >
        {seconds}
      </span>
    </div>
  );
}
