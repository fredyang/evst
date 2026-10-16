// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { clearEvstStore, createEvstStore } from "@evst/rtk";
import {
  authBundle,
  authViews,
  fromAuth,
  fromAuthApi,
  fromLoginPage,
} from "./auth.evst";

import { coreBundle, coreViews, fromLayout } from "../../core/evst/core.evst";

afterEach(() => {
  clearEvstStore();
  vi.useRealTimers();
});

it("handles invalid login, valid login, logout confirmation and dismissal", () => {
  const store = createEvstStore({
    bundles: [authBundle, coreBundle],
  });
  expect(Object.keys(store.getState()).sort()).toEqual(["auth", "core"]);
  fromLoginPage.login.publish({
    credentials: { username: "wrong", password: "x" },
  });
  expect(authViews.error.snapshot).toBe("Invalid username or password");
  expect(authViews.pending.snapshot).toBe(false);
  fromLoginPage.login.publish({
    credentials: { username: "ngrx", password: "x" },
  });
  expect(authViews.loggedIn.snapshot).toBe(true);
  fromLayout.sidenavOpened.publish();
  expect(coreViews.showSidenav.snapshot).toBe(true);
  fromAuth.logoutConfirmation.publish();
  expect(coreViews.showSidenav.snapshot).toBe(false);
  expect(authViews.confirmingLogout.snapshot).toBe(true);
  fromAuth.logoutConfirmationDismiss.publish();
  expect(authViews.loggedIn.snapshot).toBe(true);
  expect(authViews.confirmingLogout.snapshot).toBe(false);
  fromAuth.logout.publish();
  expect(authViews.loggedIn.snapshot).toBe(false);
});

it("tracks login progress and clears prior errors on a new attempt", () => {
  const failed = authBundle.reducer(
    undefined,
    fromAuthApi.loginFailure({ error: "Failed" }),
  );
  const pending = authBundle.reducer(
    failed,
    fromLoginPage.login({ credentials: { username: "test", password: "" } }),
  );
  expect(pending).toMatchObject({ pending: true, error: "" });
  const loggedIn = authBundle.reducer(
    pending,
    fromAuthApi.loginSuccess({ user: { name: "test" } }),
  );
  expect(loggedIn.pending).toBe(false);
  expect(authViews.loggedIn({ auth: loggedIn })).toBe(true);
  expect(authBundle.reducer(loggedIn, fromAuth.logout())).toEqual(
    authBundle.reducer(undefined, { type: "init" }),
  );
});
