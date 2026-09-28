import { fromAuth, fromAuthApi, fromLoginPage } from "./auth.events";
import { authState } from "./auth.state";

describe("authState", () => {
  const user = { name: "Ada" };

  it("marks login as pending and clears a previous error", () => {
    const failed = authState.reducer(
      undefined,
      fromAuthApi.loginFailure({ error: "Invalid credentials" }),
    );
    const result = authState.reducer(
      failed,
      fromLoginPage.login({ credentials: { username: "ada", password: "pw" } }),
    );

    expect(result.loginPage).toEqual({ error: null, pending: true });
  });

  it("stores a successful login and clears pending state", () => {
    const pending = authState.reducer(
      undefined,
      fromLoginPage.login({ credentials: { username: "ada", password: "pw" } }),
    );
    const result = authState.reducer(
      pending,
      fromAuthApi.loginSuccess({ user }),
    );

    expect(result.status.user).toEqual(user);
    expect(result.loginPage).toEqual({ error: null, pending: false });
  });

  it("records login failure and removes the user on logout", () => {
    const signedIn = authState.reducer(
      undefined,
      fromAuthApi.loginSuccess({ user }),
    );
    const failed = authState.reducer(
      signedIn,
      fromAuthApi.loginFailure({ error: "Unavailable" }),
    );
    const result = authState.reducer(failed, fromAuth.logout());

    expect(failed.loginPage).toEqual({ error: "Unavailable", pending: false });
    expect(result.status.user).toBeNull();
  });
});
