import { events, emptyProps } from "@evst/rtk";

export const fromLayout = events("Layout", {
  sidenavOpened: emptyProps(),
  sidenavClosed: emptyProps(),
});
export const fromUser = events("User", {
  idleTimeoutElapsed: emptyProps(),
});
