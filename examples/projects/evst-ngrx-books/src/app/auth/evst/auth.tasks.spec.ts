import { createEnvironmentInjector } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Router } from "@angular/router";
import { Actions } from "@ngrx/effects";
import type { Action } from "@ngrx/store";
import { AuthService } from "../services/auth.service";
import { fromUser } from "../../core/evst/core.events";
import { of, Subject, throwError, type Observable } from "rxjs";
import { vi } from "vitest";
import {
  fromAuth,
  fromAuthApi,
  fromAuthGuard,
  fromLoginPage,
} from "./auth.events";
import { authTasks } from "./auth.tasks";

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
      const output = context.run(authTasks.effects.login);
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
      expect(context.run(authTasks.effects.loginSuccess)).toEqual([]);
      expect(context.run(authTasks.effects.loginRedirect)).toEqual([]);
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
      const confirmation = context.run(authTasks.effects.logoutConfirmation);
      const idle = context.run(authTasks.effects.logoutIdleUser);
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
