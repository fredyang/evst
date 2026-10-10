import { afterEach, expect, it, vi } from "vitest";
import { debounce } from "../src/utils/debounce";

afterEach(() => vi.useRealTimers());

it("delivers only the latest value after a quiet interval", () => {
  vi.useFakeTimers();
  const callback = vi.fn();
  const publish = debounce(callback, 300);
  publish("r");
  vi.advanceTimersByTime(200);
  publish("react");
  vi.advanceTimersByTime(299);
  expect(callback).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(callback).toHaveBeenCalledExactlyOnceWith("react");
});

it("cancels pending publication on clearing or unmounting and can be reused", () => {
  vi.useFakeTimers();
  const callback = vi.fn();
  const publish = debounce(callback, 300);
  publish("old");
  publish.cancel();
  vi.advanceTimersByTime(300);
  expect(callback).not.toHaveBeenCalled();
  publish("new");
  vi.advanceTimersByTime(300);
  expect(callback).toHaveBeenCalledExactlyOnceWith("new");
});
