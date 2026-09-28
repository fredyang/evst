import { inject } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Router } from "@angular/router";
import { tasks } from "@ngrx-sugar/store";
import { of } from "rxjs";
import { catchError, exhaustMap, map, tap } from "rxjs/operators";
import { LogoutConfirmationDialogComponent } from "../components/logout-confirmation-dialog.component";
import { AuthService } from "../services/auth.service";
import { fromUser } from "../../core/store/core.events";
import {
  fromAuth,
  fromAuthApi,
  fromAuthGuard,
  fromLoginPage,
} from "./auth.events";

export const authTasks = tasks((on) => ({
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
    (pipe, router = inject(Router)) => pipe(tap(() => router.navigate(["/"]))),
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

  logoutIdleUser: on(fromUser.idleTimeoutElapsed, (pipe) =>
    pipe(map(() => fromAuth.logout())),
  ),
}));
