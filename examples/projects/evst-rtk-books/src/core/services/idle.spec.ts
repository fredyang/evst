// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { watchIdle } from "./idle";

afterEach(() => vi.useRealTimers());

it("resets the five-minute timeout on activity and cleans up listeners", () => {
  vi.useFakeTimers();
  const target = new EventTarget();
  const onIdle = vi.fn();
  const stop = watchIdle(target, onIdle);
  vi.advanceTimersByTime(4 * 60 * 1000);
  target.dispatchEvent(new Event("keydown"));
  vi.advanceTimersByTime(4 * 60 * 1000);
  expect(onIdle).not.toHaveBeenCalled();
  vi.advanceTimersByTime(60 * 1000);
  expect(onIdle).toHaveBeenCalledOnce();
  stop();
  target.dispatchEvent(new Event("click"));
  expect(vi.getTimerCount()).toBe(0);
});
