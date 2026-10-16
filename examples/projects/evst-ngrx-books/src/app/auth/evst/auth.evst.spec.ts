import { createEnvironmentInjector } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Router } from "@angular/router";
import { Actions } from "@ngrx/effects";
import type { Action } from "@ngrx/store";
import { AuthService } from "../services/auth.service";
import { coreBundle, fromUser } from "../../core/evst/core.evst";
import { of, Subject, throwError, type Observable } from "rxjs";
import { vi } from "vitest";
import {
  authBundle,
  fromAuth,
  fromAuthApi,
  fromAuthGuard,
  fromLoginPage,
} from "./auth.evst";

describe("authState", () => {
  const user = { name: "Ada" };
  const authReducer = authBundle.reducer;

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

    expect(authBundle.views.user.projector(signedIn.status)).toEqual(user);
    expect(authBundle.views.loggedIn.projector(signedIn.status)).toBe(true);
    expect(authBundle.views.loginPageError.projector(failed.loginPage)).toBe(
      "Unavailable",
    );
    expect(
      authBundle.views.loginPagePending.projector(signedIn.loginPage),
    ).toBe(false);
  });
});

describe("authTasks", () => {
  function setup() {
    const events = new Subject<Action>();
    const auth = { login: vi.fn(() => of({ name: "Ada" })) };
    const dialog = { open: vi.fn(() => ({ afterClosed: () => of(true) })) };
    const router = { navigate: vi.fn(() => Promise.resolve(true)) };
    const injector = createEnvironmentInjector(
      [
        { provide: Actions, useValue: new Actions(events) },
        { provide: AuthService, useValue: auth },
        { provide: MatDialog, useValue: dialog },
        { provide: Router, useValue: router },
      ],
      null!,
    );
    const run = (task: () => Observable<unknown>) => {
      const output: Action[] = [];
      injector.runInContext(() =>
        task().subscribe((event) => output.push(event as Action)),
      );
      return output;
    };

    return { auth, dialog, events, injector, router, run };
  }

  it("publishes login success and failure events", () => {
    const context = setup();
    const credentials = { username: "ada", password: "pw" };
    try {
      const output = context.run(authBundle.effects.login);
      context.events.next(fromLoginPage.login({ credentials }));
      context.auth.login.mockReturnValueOnce(
        throwError(() => new Error("Unavailable")),
      );
      context.events.next(fromLoginPage.login({ credentials }));

      expect(context.auth.login).toHaveBeenCalledWith(credentials);
      expect(output).toEqual([
        fromAuthApi.loginSuccess({ user: { name: "Ada" } }),
        fromAuthApi.loginFailure({ error: expect.any(Error) }),
      ]);
    } finally {
      context.injector.destroy();
    }
  });

  it("navigates after login success and whenever login is required or logout occurs", () => {
    const context = setup();
    try {
      expect(context.run(authBundle.effects.loginSuccess)).toEqual([]);
      expect(context.run(authBundle.effects.loginRedirect)).toEqual([]);
      context.events.next(fromAuthApi.loginSuccess({ user: { name: "Ada" } }));
      context.events.next(fromAuthGuard.loginRequired());
      context.events.next(fromAuth.logout());

      expect(context.router.navigate).toHaveBeenNthCalledWith(1, ["/"]);
      expect(context.router.navigate).toHaveBeenNthCalledWith(2, ["/login"]);
      expect(context.router.navigate).toHaveBeenNthCalledWith(3, ["/login"]);
    } finally {
      context.injector.destroy();
    }
  });

  it("confirms logout through the dialog and logs idle users out", () => {
    const context = setup();
    try {
      const confirmation = context.run(authBundle.effects.logoutConfirmation);
      const idle = context.run(coreBundle.effects.logoutIdleUser);
      context.events.next(fromAuth.logoutConfirmation());
      context.dialog.open.mockReturnValueOnce({ afterClosed: () => of(false) });
      context.events.next(fromAuth.logoutConfirmation());
      context.events.next(fromUser.idleTimeoutElapsed());

      expect(confirmation).toEqual([
        fromAuth.logout(),
        fromAuth.logoutConfirmationDismiss(),
      ]);
      expect(idle).toEqual([fromAuth.logout()]);
    } finally {
      context.injector.destroy();
    }
  });
});
