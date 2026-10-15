// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { watchIdle } from "./idle";

afterEach(() => vi.useRealTimers());

it("resets the five-minute timeout on activity and cleans up listeners", () => {
  vi.useFakeTimers();
  const onIdle = vi.fn();
  const stop = watchIdle(onIdle);
  vi.advanceTimersByTime(4 * 60 * 1000);
  document.dispatchEvent(new Event("keydown"));
  vi.advanceTimersByTime(4 * 60 * 1000);
  expect(onIdle).not.toHaveBeenCalled();
  vi.advanceTimersByTime(60 * 1000);
  expect(onIdle).toHaveBeenCalledOnce();
  stop();
  document.dispatchEvent(new Event("click"));
  expect(vi.getTimerCount()).toBe(0);
});
