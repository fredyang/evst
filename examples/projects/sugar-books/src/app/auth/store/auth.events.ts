import { emptyProps, props } from "@ngrx/store";
import { events } from "@ngrx-sugar/store";
import type { Credentials, User } from "../models/user";

export const fromAuth = events("Auth", {
  logout: emptyProps(),
  logoutConfirmation: emptyProps(),
  logoutConfirmationDismiss: emptyProps(),
});

export const fromAuthApi = events("Auth/API", {
  loginSuccess: props<{ user: User }>(),
  loginFailure: props<{ error: string }>(),
});

export const fromAuthGuard = events("Auth Guard", {
  loginRequired: emptyProps(),
});

export const fromLoginPage = events("Login Page", {
  login: props<{ credentials: Credentials }>(),
});
