import { emptyProps } from "@ngrx/store";
import { events } from "@evst/store";

export const fromUser = events("User", { idleTimeoutElapsed: emptyProps() });

export const fromLayout = events("Layout", {
  sidenavOpened: emptyProps(),
  sidenavClosed: emptyProps(),
});
