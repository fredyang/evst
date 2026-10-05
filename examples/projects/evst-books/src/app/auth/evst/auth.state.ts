import { state, view } from "@evst/store";
import type { User } from "../models/user";
import { fromAuth, fromAuthApi, fromLoginPage } from "./auth.events";

export interface StatusState {
  user: User | null;
}

export interface LoginPageState {
  error: string | null;
  pending: boolean;
}

export interface AuthState {
  status: StatusState;
  loginPage: LoginPageState;
}

export const initialStatusState: StatusState = {
  user: null,
};

export const initialLoginPageState: LoginPageState = {
  error: null,
  pending: false,
};

export const authState = state("auth", {
  status: initialStatusState,
  loginPage: initialLoginPageState,
})
  .handle((on) => ({
    beginLogin: on(fromLoginPage.login, (current) => ({
      ...current,
      loginPage: {
        ...current.loginPage,
        error: null,
        pending: true,
      },
    })),

    applyLogin: on(fromAuthApi.loginSuccess, (current, { user }) => ({
      ...current,
      status: {
        ...current.status,
        user,
      },
      loginPage: {
        ...current.loginPage,
        error: null,
        pending: false,
      },
    })),

    recordLoginFailure: on(fromAuthApi.loginFailure, (current, { error }) => ({
      ...current,
      loginPage: {
        ...current.loginPage,
        error,
        pending: false,
      },
    })),

    clearSession: on(fromAuth.logout, (current) => ({
      ...current,
      status: initialStatusState,
    })),
  }))
  .extraViews(({ status, loginPage }) => ({
    user: view(status, (value) => value.user),

    loggedIn: view(status, (value) => Boolean(value.user)),

    loginPageError: view(loginPage, (value) => value.error),

    loginPagePending: view(loginPage, (value) => value.pending),
  }));

export const authViews = authState.views;
