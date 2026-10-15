import { state } from "@evst/rtk";
import { fromAuth } from "../../auth/evst/auth.evst";
import { fromLayout } from "./core.events";

export const coreState = state("core", { showSidenav: false }).stateOn(
  (on) => ({
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
  }),
);
export const coreViews = coreState.views;
