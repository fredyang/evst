import { state } from "@ngrx-sugar/store";
import { fromAuth } from "../../auth/store/auth.events";
import { fromLayout } from "./core.events";
import { coreTasks } from "./core.tasks";

export const coreState = state("core", { showSidenav: false })
  .on(fromLayout.sidenavOpened, (state) => ({ ...state, showSidenav: true }))
  .on(fromLayout.sidenaveClosed, (state) => ({ ...state, showSidenav: false }))
  .on(fromAuth.logoutConfirmation, (state) => ({
    ...state,
    showSidenav: false,
  }))
  .withTasks(coreTasks);

export const coreViews = coreState.views;
