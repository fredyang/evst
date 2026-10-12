import { emptyProps } from "@ngrx/store";
import { events } from "@evst/ngrx";

export const fromUser = events("User", { idleTimeoutElapsed: emptyProps() });

export const fromLayout = events("Layout", {
  sidenavOpened: emptyProps(),
  sidenavClosed: emptyProps(),
});
