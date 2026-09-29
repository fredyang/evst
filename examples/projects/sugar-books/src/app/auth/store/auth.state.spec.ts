import { fromAuth, fromAuthApi, fromLoginPage } from "./auth.events";
import { authState } from "./auth.state";

describe("authState", () => {
  const user = { name: "Ada" };
  const authReducer = authState.reducer;

  it("marks login as pending and clears a previous error", () => {
    const failed = authReducer(
      undefined,
      fromAuthApi.loginFailure({ error: "Invalid credentials" }),
    );
    const pending = authReducer(
      failed,
      fromLoginPage.login({ credentials: { username: "ada", password: "pw" } }),
    );

    expect(pending.loginPage).toEqual({ error: null, pending: true });
  });

  it("stores a successful login and clears pending state", () => {
    const loggingIn = authReducer(
      undefined,
      fromLoginPage.login({ credentials: { username: "ada", password: "pw" } }),
    );
    const signedIn = authReducer(loggingIn, fromAuthApi.loginSuccess({ user }));

    expect(signedIn.status.user).toEqual(user);
    expect(signedIn.loginPage).toEqual({ error: null, pending: false });
  });

  it("records login failure and removes the user on logout", () => {
    const signedIn = authReducer(undefined, fromAuthApi.loginSuccess({ user }));
    const failed = authReducer(
      signedIn,
      fromAuthApi.loginFailure({ error: "Unavailable" }),
    );
    const signedOut = authReducer(failed, fromAuth.logout());

    expect(failed.loginPage).toEqual({ error: "Unavailable", pending: false });
    expect(signedOut.status.user).toBeNull();
  });

  it("projects authentication and login-page views", () => {
    const failed = authReducer(
      undefined,
      fromAuthApi.loginFailure({ error: "Unavailable" }),
    );
    const signedIn = authReducer(failed, fromAuthApi.loginSuccess({ user }));

    expect(authState.views.user.projector(signedIn.status)).toEqual(user);
    expect(authState.views.loggedIn.projector(signedIn.status)).toBe(true);
    expect(authState.views.loginPageError.projector(failed.loginPage)).toBe(
      "Unavailable",
    );
    expect(authState.views.loginPagePending.projector(signedIn.loginPage)).toBe(
      false,
    );
  });
});
