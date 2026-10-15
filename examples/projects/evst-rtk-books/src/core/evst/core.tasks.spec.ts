// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { clearEvstStore, createEvstStore, task } from "@evst/rtk";
import { coreTasks } from "./core.tasks";
import { fromUser } from "./core.events";

afterEach(() => {
  clearEvstStore();
  vi.useRealTimers();
});

it("emits idle outcomes from browser activity and stops the watcher on cleanup", () => {
  vi.useFakeTimers();
  let timeouts = 0;
  const observer = task.subscribe((on) => ({
    idle: on(fromUser.idleTimeoutElapsed, () => {
      timeouts++;
    }),
  }));
  createEvstStore({ tasks: [observer, coreTasks] });
  vi.advanceTimersByTime(4 * 60 * 1000);
  document.dispatchEvent(new Event("click"));
  vi.advanceTimersByTime(4 * 60 * 1000);
  expect(timeouts).toBe(0);
  vi.advanceTimersByTime(60 * 1000);
  expect(timeouts).toBe(1);
  document.dispatchEvent(new Event("keydown"));
  expect(vi.getTimerCount()).toBe(1);
  clearEvstStore();
  expect(vi.getTimerCount()).toBe(0);
  document.dispatchEvent(new Event("click"));
  expect(vi.getTimerCount()).toBe(0);
});
