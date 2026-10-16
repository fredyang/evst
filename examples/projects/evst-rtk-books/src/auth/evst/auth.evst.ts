import { events, props, emptyProps, state, view } from "@evst/rtk";

export const fromLoginPage = events("Login Page", {
  login: props<{ credentials: { username: string; password: string } }>(),
});

export const fromAuthApi = events("Auth API", {
  loginSuccess: props<{ user: { name: string } }>(),
  loginFailure: props<{ error: string }>(),
});

export const fromAuth = events("Auth", {
  logout: emptyProps(),
  logoutConfirmation: emptyProps(),
  logoutConfirmationDismiss: emptyProps(),
});

export const authBundle = state("auth", {
  user: null as { name: string } | null,
  pending: false,
  error: "",
  confirmingLogout: false,
})
  .stateOn((on) => ({
    beginLogin: on(fromLoginPage.login, (current) => {
      current.pending = true;
      current.error = "";
    }),

    applyLogin: on(fromAuthApi.loginSuccess, (current, { user }) => {
      current.user = user;
      current.pending = false;
    }),

    recordFailure: on(fromAuthApi.loginFailure, (current, { error }) => {
      current.pending = false;
      current.error = error;
    }),

    confirmLogout: on(fromAuth.logoutConfirmation, (current) => {
      current.confirmingLogout = true;
    }),

    dismissLogout: on(fromAuth.logoutConfirmationDismiss, (current) => {
      current.confirmingLogout = false;
    }),

    clearSession: on(fromAuth.logout, (current) => {
      current.user = null;
      current.pending = false;
      current.error = "";
      current.confirmingLogout = false;
    }),
  }))
  .extraViews(({ user }) => ({
    loggedIn: view(user, (currentUser) => Boolean(currentUser)),
  }))
  .taskOn((on) => ({
    login: on(fromLoginPage.login, ({ credentials }) => {
      // Matches the Angular example's demo authentication; no backend session.
      if (!["ngrx", "test"].includes(credentials.username)) {
        return fromAuthApi.loginFailure({
          error: "Invalid username or password",
        });
      }
      return fromAuthApi.loginSuccess({ user: { name: "User" } });
    }),
  }));

export const authViews = authBundle.views;
