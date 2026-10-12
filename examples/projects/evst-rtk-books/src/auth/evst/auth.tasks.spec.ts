// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { clearEvstStore, createEvst } from "@evst/rtk";
import { authState, authViews } from "./auth.state";
import { authTasks } from "./auth.tasks";
import { fromAuth, fromLoginPage } from "./auth.events";
import { coreState, coreViews } from "../../core/evst/core.state";
import { fromLayout } from "../../core/evst/core.events";

afterEach(() => {
  clearEvstStore();
  vi.useRealTimers();
});

it("handles invalid login, valid login, logout confirmation and dismissal", () => {
  const store = createEvst({
    states: [authState, coreState],
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
