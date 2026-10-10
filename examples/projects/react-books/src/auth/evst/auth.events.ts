import { events, props, emptyProps } from "@evst/react";

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
