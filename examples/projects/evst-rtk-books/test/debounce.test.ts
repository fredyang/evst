import { afterEach, expect, it, vi } from "vitest";
import { debounce } from "../src/utils/debounce";

afterEach(() => vi.useRealTimers());

it("runs only the latest operation after a quiet interval", async () => {
  vi.useFakeTimers();
  const operation = vi.fn(async (query: string) => query);
  const run = debounce(operation, 300);
  const first = run("r");
  vi.advanceTimersByTime(200);
  const latest = run("react");
  await expect(first).resolves.toBeUndefined();
  vi.advanceTimersByTime(299);
  expect(operation).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  await expect(latest).resolves.toBe("react");
  expect(operation).toHaveBeenCalledExactlyOnceWith("react");
});

it("cancels a pending operation and can be reused", async () => {
  vi.useFakeTimers();
  const operation = vi.fn(async (query: string) => query);
  const run = debounce(operation, 300);
  const old = run("old");
  run.cancel();
  await expect(old).resolves.toBeUndefined();
  vi.advanceTimersByTime(300);
  expect(operation).not.toHaveBeenCalled();
  const latest = run("new");
  vi.advanceTimersByTime(300);
  await expect(latest).resolves.toBe("new");
  expect(operation).toHaveBeenCalledExactlyOnceWith("new");
});
