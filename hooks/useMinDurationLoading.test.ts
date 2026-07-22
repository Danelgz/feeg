import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMinDurationLoading } from "./useMinDurationLoading";

const OPTS = { showDelayMs: 300, minVisibleMs: 3000 };

describe("useMinDurationLoading", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("never shows if active turns off before the show delay elapses", () => {
    const { result, rerender } = renderHook(({ active }) => useMinDurationLoading(active, OPTS), {
      initialProps: { active: true },
    });
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current).toBe(false);

    rerender({ active: false });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(false);
  });

  it("shows once active stays true past the show delay", () => {
    const { result } = renderHook(() => useMinDurationLoading(true, OPTS));
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe(true);
  });

  it("stays visible for the minimum duration even after active turns off quickly", () => {
    const { result, rerender } = renderHook(({ active }) => useMinDurationLoading(active, OPTS), {
      initialProps: { active: true },
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe(true);

    // La sincronización termina casi al instante de mostrarse.
    rerender({ active: false });
    act(() => {
      vi.advanceTimersByTime(2999);
    });
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(false);
  });

  it("cancels the pending hide and keeps showing if active turns back on in time", () => {
    const { result, rerender } = renderHook(({ active }) => useMinDurationLoading(active, OPTS), {
      initialProps: { active: true },
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe(true);

    rerender({ active: false });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(true);

    // Otra sincronización arranca antes de que se cumplieran los 3s de mínimo.
    rerender({ active: true });
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(result.current).toBe(true);
  });
});
