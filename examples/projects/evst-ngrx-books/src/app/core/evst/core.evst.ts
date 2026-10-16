import { DOCUMENT } from "@angular/common";
import { inject } from "@angular/core";
import { emptyProps } from "@ngrx/store";
import { events, evst } from "@evst/ngrx";
import { fromEvent, map, merge, switchMap, timer } from "rxjs";
import { fromAuth } from "../../auth/evst/auth.evst";

export const fromUser = events("User", { idleTimeoutElapsed: emptyProps() });

export const fromLayout = events("Layout", {
  sidenavOpened: emptyProps(),
  sidenavClosed: emptyProps(),
});

export const coreBundle = evst("core", { showSidenav: false })
  .state((on) => ({
    openSidenav: on(fromLayout.sidenavOpened, (state) => ({
      ...state,
      showSidenav: true,
    })),
    closeSidenav: on(fromLayout.sidenavClosed, (state) => ({
      ...state,
      showSidenav: false,
    })),
    closeSidenavForLogout: on(fromAuth.logoutConfirmation, (state) => ({
      ...state,
      showSidenav: false,
    })),
  }))
  .task((on) => ({
    logoutIdleUser: on(fromUser.idleTimeoutElapsed, (pipe) =>
      pipe(map(() => fromAuth.logout())),
    ),
    // eslint-disable-next-line evst/require-task-event -- Observes browser activity for the application lifetime to publish idle timeouts.
    idle: on((document = inject(DOCUMENT)) =>
      merge(
        fromEvent(document, "click"),
        fromEvent(document, "keydown"),
        fromEvent(document, "mousemove"),
      ).pipe(
        switchMap(() => timer(5 * 60 * 1000)),
        map(() => fromUser.idleTimeoutElapsed()),
      ),
    ),
  }));

export const coreViews = coreBundle.views;
