import { events, emptyProps } from "@evst/react";

export const fromLayout = events("Layout", {
  sidenavOpened: emptyProps(),
  sidenavClosed: emptyProps(),
});
export const fromUser = events("User", {
  idleTimeoutElapsed: emptyProps(),
});
