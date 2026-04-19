import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTimer } from "./useTimer";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useTimer", () => {
  it("returns null when deadline is null", () => {
    const { result } = renderHook(() => useTimer({ deadline: null }));
    expect(result.current).toBeNull();
  });

  it("returns remaining ms and ticks down", () => {
    const deadline = new Date(Date.now() + 5_000).toISOString();
    const { result } = renderHook(() => useTimer({ deadline }));

    // immediate tick on mount
    expect(result.current).toBeGreaterThan(4_900);
    expect(result.current).toBeLessThanOrEqual(5_000);

    act(() => {
      vi.advanceTimersByTime(2_000);
    });

    expect(result.current).toBeGreaterThan(2_900);
    expect(result.current).toBeLessThanOrEqual(3_000);
  });

  it("clamps to 0 at expiry and fires onExpire exactly once", () => {
    const deadline = new Date(Date.now() + 1_000).toISOString();
    const onExpire = vi.fn();
    const { result } = renderHook(() => useTimer({ deadline, onExpire }));

    act(() => {
      vi.advanceTimersByTime(1_100);
    });

    expect(result.current).toBe(0);
    expect(onExpire).toHaveBeenCalledTimes(1);

    // keep ticking — must not fire again
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("fires onExpire immediately when deadline is already in the past on mount", () => {
    const deadline = new Date(Date.now() - 2_000).toISOString();
    const onExpire = vi.fn();
    const { result } = renderHook(() => useTimer({ deadline, onExpire }));
    expect(result.current).toBe(0);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("resets (remaining -> null) and rearms when deadline changes to null", () => {
    const firstDeadline = new Date(Date.now() + 5_000).toISOString();
    const { result, rerender } = renderHook(
      ({ d }: { d: string | null }) => useTimer({ deadline: d }),
      { initialProps: { d: firstDeadline as string | null } }
    );

    expect(result.current).toBeGreaterThan(0);

    rerender({ d: null });
    expect(result.current).toBeNull();
  });

  it("rearms onExpire when deadline transitions from expired to a fresh future value", () => {
    const d1 = new Date(Date.now() + 1_000).toISOString();
    const onExpire = vi.fn();
    const { rerender } = renderHook(
      ({ d }: { d: string }) => useTimer({ deadline: d, onExpire }),
      { initialProps: { d: d1 } }
    );

    act(() => {
      vi.advanceTimersByTime(1_500);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);

    const d2 = new Date(Date.now() + 1_000).toISOString();
    rerender({ d: d2 });

    act(() => {
      vi.advanceTimersByTime(1_500);
    });
    expect(onExpire).toHaveBeenCalledTimes(2);
  });

  it("always uses the latest onExpire without tearing down the interval", () => {
    const deadline = new Date(Date.now() + 1_000).toISOString();
    const first = vi.fn();
    const second = vi.fn();

    const { rerender } = renderHook(
      ({ cb }: { cb: () => void }) => useTimer({ deadline, onExpire: cb }),
      { initialProps: { cb: first as () => void } }
    );

    // Swap the callback before expiry — the ref update should make the second fn win.
    rerender({ cb: second });

    act(() => {
      vi.advanceTimersByTime(1_500);
    });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("clears its interval on unmount", () => {
    const deadline = new Date(Date.now() + 10_000).toISOString();
    const onExpire = vi.fn();
    const { unmount } = renderHook(() => useTimer({ deadline, onExpire }));
    unmount();
    act(() => {
      vi.advanceTimersByTime(20_000);
    });
    expect(onExpire).not.toHaveBeenCalled();
  });
});
