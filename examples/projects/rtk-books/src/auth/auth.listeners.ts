import type { ListenerMiddlewareInstance } from "@reduxjs/toolkit";
import type { AppState } from "../app-state";
import { idleTimeoutElapsed } from "../core/core.slice";
import { authActions } from "./auth.slice";

export function registerAuthListeners(
  listener: ListenerMiddlewareInstance<AppState>,
) {
  listener.startListening({
    actionCreator: authActions.loginRequested,
    effect: async ({ payload: credentials }, { dispatch }) => {
      // Matches the Angular demo: accepted usernames are hard-coded and any
      // password is accepted. This is not a real authentication boundary.
      if (!["ngrx", "test"].includes(credentials.username)) {
        dispatch(authActions.loginFailed("Invalid username or password"));
        return;
      }

      dispatch(authActions.loginSucceeded({ name: "User" }));
    },
  });

  listener.startListening({
    actionCreator: idleTimeoutElapsed,
    effect: (_action, { dispatch }) => {
      dispatch(authActions.loggedOut());
    },
  });
}
