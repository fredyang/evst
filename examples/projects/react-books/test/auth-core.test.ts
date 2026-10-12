// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { clearEvstStore, createEvstStore } from "@evst/rtk";
import { authState, authViews } from "../src/auth/evst/auth.state";
import { authTasks } from "../src/auth/evst/auth.tasks";
import { fromAuth, fromLoginPage } from "../src/auth/evst/auth.events";
import { coreState, coreViews } from "../src/core/evst/core.state";
import { fromLayout, fromUser } from "../src/core/evst/core.events";
import { watchIdle } from "../src/core/services/idle";

afterEach(() => {
  clearEvstStore();
  vi.useRealTimers();
});

it("handles invalid login, valid login, logout confirmation and dismissal", () => {
  const store = createEvstStore({
    features: [authState, coreState],
    tasks: [authTasks],
  });
  expect(Object.keys(store.getState())).toEqual(["auth", "core"]);
  fromLoginPage.login.publish({
    credentials: { username: "wrong", password: "x" },
  });
  expect(authViews.error.value()).toBe("Invalid username or password");
  expect(authViews.pending.value()).toBe(false);
  fromLoginPage.login.publish({
    credentials: { username: "ngrx", password: "x" },
  });
  expect(authViews.loggedIn.value()).toBe(true);
  fromLayout.sidenavOpened.publish();
  expect(coreViews.showSidenav.value()).toBe(true);
  fromAuth.logoutConfirmation.publish();
  expect(coreViews.showSidenav.value()).toBe(false);
  expect(authViews.confirmingLogout.value()).toBe(true);
  fromAuth.logoutConfirmationDismiss.publish();
  expect(authViews.loggedIn.value()).toBe(true);
  expect(authViews.confirmingLogout.value()).toBe(false);
  fromAuth.logout.publish();
  expect(authViews.loggedIn.value()).toBe(false);
});

it("resets the five-minute idle timer on activity and cleans up", () => {
  vi.useFakeTimers();
  createEvstStore({ features: [authState], tasks: [authTasks] });
  fromLoginPage.login.publish({
    credentials: { username: "test", password: "" },
  });
  const target = new EventTarget();
  const stop = watchIdle(target, () => fromUser.idleTimeoutElapsed.publish());
  vi.advanceTimersByTime(4 * 60 * 1000);
  target.dispatchEvent(new Event("keydown"));
  vi.advanceTimersByTime(4 * 60 * 1000);
  expect(authViews.loggedIn.value()).toBe(true);
  vi.advanceTimersByTime(60 * 1000);
  expect(authViews.loggedIn.value()).toBe(false);
  stop();
  target.dispatchEvent(new Event("click"));
  expect(vi.getTimerCount()).toBe(0);
});
