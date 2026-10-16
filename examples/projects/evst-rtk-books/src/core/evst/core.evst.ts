import { events, emptyProps, state } from "@evst/rtk";
import { fromAuth } from "../../auth/evst/auth.evst";

export const fromLayout = events("Layout", {
  sidenavOpened: emptyProps(),
  sidenavClosed: emptyProps(),
});
export const fromUser = events("User", {
  idleTimeoutElapsed: emptyProps(),
});

export const coreBundle = state("core", { showSidenav: false })
  .stateOn((on) => ({
    open: on(fromLayout.sidenavOpened, (current) => {
      current.showSidenav = true;
    }),
    close: on(fromLayout.sidenavClosed, (current) => {
      current.showSidenav = false;
    }),
    closeForConfirmation: on(fromAuth.logoutConfirmation, (current) => {
      current.showSidenav = false;
    }),
    closeForLogout: on(fromAuth.logout, (current) => {
      current.showSidenav = false;
    }),
  }))
  .taskOn((on) => ({
    logoutIdleUser: on(fromUser.idleTimeoutElapsed, () => fromAuth.logout()),
    idle: on((emit) => {
      let timer: number;
      const reset = () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(
          () => emit(fromUser.idleTimeoutElapsed()),
          5 * 60 * 1000,
        );
      };
      const events = ["click", "keydown", "mousemove", "touchstart", "scroll"];
      events.forEach((event) => document.addEventListener(event, reset));
      return () => {
        window.clearTimeout(timer);
        events.forEach((event) => document.removeEventListener(event, reset));
      };
    }),
  }));

export const coreViews = coreBundle.views;
