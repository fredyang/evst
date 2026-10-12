import { expect, it } from "vitest";
import { authState, authViews } from "./auth.state";
import { fromAuth, fromAuthApi, fromLoginPage } from "./auth.events";

it("tracks login progress and clears prior errors on a new attempt", () => {
  const failed = authState.reducer(
    undefined,
    fromAuthApi.loginFailure({ error: "Failed" }),
  );
  const pending = authState.reducer(
    failed,
    fromLoginPage.login({ credentials: { username: "test", password: "" } }),
  );
  expect(pending).toMatchObject({ pending: true, error: "" });
  const loggedIn = authState.reducer(
    pending,
    fromAuthApi.loginSuccess({ user: { name: "test" } }),
  );
  expect(loggedIn.pending).toBe(false);
  expect(authViews.loggedIn({ auth: loggedIn })).toBe(true);
  expect(authState.reducer(loggedIn, fromAuth.logout())).toEqual(
    authState.reducer(undefined, { type: "init" }),
  );
});
