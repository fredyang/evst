import { events, emptyProps, evst } from "@evst/rtk";
import { fromAuth } from "../../auth/evst/auth.evst";

export const fromLayout = events("Layout", {
  sidenavOpened: emptyProps(),
  sidenavClosed: emptyProps(),
});
export const fromUser = events("User", {
  idleTimeoutElapsed: emptyProps(),
});

export const coreBundle = evst("core", { showSidenav: false })
  .state((on) => ({
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
  .task((on) => ({
    logoutIdleUser: on(fromUser.idleTimeoutElapsed, () => fromAuth.logout()),
    idle: on(() => {
      let timer: number;
      const monitorIdleTimeout = () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(
          () => fromUser.idleTimeoutElapsed.publish(),
          5 * 60 * 1000,
        );
      };
      const events = ["click", "keydown", "mousemove", "touchstart", "scroll"];
      events.forEach((event) =>
        document.addEventListener(event, monitorIdleTimeout),
      );
      return () => {
        window.clearTimeout(timer);
        events.forEach((event) =>
          document.removeEventListener(event, monitorIdleTimeout),
        );
      };
    }),
  }));

export const coreViews = coreBundle.views;
