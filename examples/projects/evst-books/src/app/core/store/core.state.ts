import { state } from "@evst/store";
import { fromAuth } from "../../auth/store/auth.events";
import { fromLayout } from "./core.events";

export const coreState = state("core", { showSidenav: false })
  .on(fromLayout.sidenavOpened, (state) => ({ ...state, showSidenav: true }))
  .on(fromLayout.sidenavClosed, (state) => ({ ...state, showSidenav: false }))
  .on(fromAuth.logoutConfirmation, (state) => ({
    ...state,
    showSidenav: false,
  }));

export const coreViews = coreState.views;
