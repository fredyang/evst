import { emptyProps } from "@ngrx/store";
import { events } from "@ngrx-sugar/store";

export const fromUser = events("User", { idleTimeoutElapsed: emptyProps() });

export const fromLayout = events("Layout", {
  sidenavOpened: emptyProps(),
  sidenavClosed: emptyProps(),
});
