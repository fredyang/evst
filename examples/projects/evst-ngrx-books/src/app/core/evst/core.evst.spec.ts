import { DOCUMENT } from "@angular/common";
import { createEnvironmentInjector } from "@angular/core";
import { Actions } from "@ngrx/effects";
import type { Action } from "@ngrx/store";
import { Subject, type Observable } from "rxjs";
import { vi } from "vitest";
import { coreBundle, fromLayout, fromUser } from "./core.evst";
import { fromAuth } from "../../auth/evst/auth.evst";

describe("coreBundle", () => {
  it("publishes an idle-timeout event after five minutes without activity", () => {
    vi.useFakeTimers();
    const document = new EventTarget();
    const injector = createEnvironmentInjector(
      [
        { provide: Actions, useValue: new Actions(new Subject<Action>()) },
        { provide: DOCUMENT, useValue: document },
      ],
      null!,
    );
    try {
      const output: Action[] = [];
      injector.runInContext(() =>
        (coreBundle.effects.idle as () => Observable<unknown>)().subscribe(
          (event) => output.push(event as Action),
        ),
      );
      document.dispatchEvent(new Event("mousemove"));
      vi.advanceTimersByTime(5 * 60 * 1000);

      expect(output).toEqual([fromUser.idleTimeoutElapsed()]);
    } finally {
      injector.destroy();
      vi.useRealTimers();
    }
  });
});

describe("coreBundle", () => {
  const coreReducer = coreBundle.reducer;

  it("opens and closes the sidenav in response to layout events", () => {
    const opened = coreReducer(undefined, fromLayout.sidenavOpened());
    const closed = coreReducer(opened, fromLayout.sidenavClosed());

    expect(opened.showSidenav).toBe(true);
    expect(closed.showSidenav).toBe(false);
  });

  it("closes the sidenav when logout confirmation begins", () => {
    const opened = coreReducer(undefined, fromLayout.sidenavOpened());
    const closed = coreReducer(opened, fromAuth.logoutConfirmation());

    expect(closed.showSidenav).toBe(false);
  });
});
