import { state } from "@evst/ngrx";
import { fromAuth } from "../../auth/evst/auth.events";
import { fromLayout } from "./core.events";

export const coreState = state("core", { showSidenav: false }).handle((on) => ({
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
}));

export const coreViews = coreState.views;
