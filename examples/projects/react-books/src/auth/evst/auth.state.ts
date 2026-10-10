import { state, view } from "@evst/react";
import { fromAuth, fromAuthApi, fromLoginPage } from "./auth.events";

export const authState = state("auth", {
  user: null as { name: string } | null,
  pending: false,
  error: "",
  confirmingLogout: false,
}).handle((on) => ({
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
}));
export const authViews = {
  ...authState.views,
  loggedIn: view(authState.views.user, (user) => Boolean(user)),
};
