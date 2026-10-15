import { expect, it } from "vitest";
import {
  authBundle,
  authViews,
  fromAuth,
  fromAuthApi,
  fromLoginPage,
} from "./auth.evst";

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
