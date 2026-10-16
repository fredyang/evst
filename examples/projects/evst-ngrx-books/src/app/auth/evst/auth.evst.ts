import { inject } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Router } from "@angular/router";
import { emptyProps, props } from "@ngrx/store";
import { events, evst, view } from "@evst/ngrx-store";
import { of } from "rxjs";
import { catchError, exhaustMap, map, tap } from "rxjs/operators";
import type { Credentials, User } from "../models/user";
import { LogoutConfirmationDialogComponent } from "../components/logout-confirmation-dialog.component";
import { AuthService } from "../services/auth.service";

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

export interface StatusState {
  user: User | null;
}

export interface LoginPageState {
  error: string | null;
  pending: boolean;
}

export const initialStatusState: StatusState = {
  user: null,
};

export const initialLoginPageState: LoginPageState = {
  error: null,
  pending: false,
};

export const authBundle = evst("auth", {
  status: initialStatusState,
  loginPage: initialLoginPageState,
})
  .view(({ status, loginPage }) => ({
    user: view(status, (value) => value.user),

    loggedIn: view(status, (value) => Boolean(value.user)),

    loginPageError: view(loginPage, (value) => value.error),

    loginPagePending: view(loginPage, (value) => value.pending),
  }))
  .state((on) => ({
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
  .task((on) => ({
    login: on(fromLoginPage.login, (pipe, service = inject(AuthService)) =>
      pipe(
        exhaustMap(({ credentials }) =>
          service.login(credentials).pipe(
            map((user) => fromAuthApi.loginSuccess({ user })),
            catchError((error) => of(fromAuthApi.loginFailure({ error }))),
          ),
        ),
      ),
    ),

    loginSuccess: on(
      fromAuthApi.loginSuccess,
      (pipe, router = inject(Router)) =>
        pipe(tap(() => router.navigate(["/"]))),
      { dispatch: false },
    ),

    loginRedirect: on(
      fromAuthGuard.loginRequired,
      fromAuth.logout,
      (pipe, router = inject(Router)) =>
        pipe(tap(() => router.navigate(["/login"]))),
      { dispatch: false },
    ),

    logoutConfirmation: on(
      fromAuth.logoutConfirmation,
      (pipe, dialog = inject(MatDialog)) =>
        pipe(
          exhaustMap(() =>
            dialog
              .open<LogoutConfirmationDialogComponent, undefined, boolean>(
                LogoutConfirmationDialogComponent,
              )
              .afterClosed(),
          ),
          map((result) =>
            result ? fromAuth.logout() : fromAuth.logoutConfirmationDismiss(),
          ),
        ),
    ),
  }));

export const authViews = authBundle.views;
