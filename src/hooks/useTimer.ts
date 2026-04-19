"use client";

import { useEffect, useRef, useState } from "react";

interface UseTimerOptions {
  deadline: string | null; // ISO timestamptz
  onExpire?: () => void;
}

export function useTimer({ deadline, onExpire }: UseTimerOptions) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  const firedRef = useRef(false);

  useEffect(() => {
    if (!deadline) {
      setRemainingMs(null);
      firedRef.current = false;
      return;
    }

    firedRef.current = false;
    const target = new Date(deadline).getTime();

    const tick = () => {
      const now = Date.now();
      const remaining = target - now;
      if (remaining <= 0) {
        setRemainingMs(0);
        if (!firedRef.current) {
          firedRef.current = true;
          onExpireRef.current?.();
        }
      } else {
        setRemainingMs(remaining);
      }
    };

    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [deadline]);

  return remainingMs;
}
