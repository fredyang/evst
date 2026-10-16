// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { clearEvstStore, createEvstStore, task } from "@evst/rtk";
import { coreBundle, fromLayout, fromUser } from "./core.evst";
import { fromAuth } from "../../auth/evst/auth.evst";

afterEach(() => {
  clearEvstStore();
  vi.useRealTimers();
});

it("emits idle outcomes from browser activity and stops the watcher on cleanup", () => {
  vi.useFakeTimers();
  let timeouts = 0;
  const observer = task((on) => ({
    idle: on(fromUser.idleTimeoutElapsed, () => {
      timeouts++;
    }),
  }));
  createEvstStore(coreBundle, observer);
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

it("opens navigation and closes it for menu dismissal and sign out", () => {
  const opened = coreBundle.reducer(undefined, fromLayout.sidenavOpened());
  expect(opened.showSidenav).toBe(true);
  for (const event of [
    fromLayout.sidenavClosed(),
    fromAuth.logoutConfirmation(),
    fromAuth.logout(),
  ]) {
    expect(coreBundle.reducer(opened, event).showSidenav).toBe(false);
  }
});
