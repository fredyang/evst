import { expect, it } from "vitest";
import { coreState } from "./core.state";
import { fromLayout } from "./core.events";
import { fromAuth } from "../../auth/evst/auth.events";

it("opens navigation and closes it for menu dismissal and sign out", () => {
  const opened = coreState.reducer(undefined, fromLayout.sidenavOpened());
  expect(opened.showSidenav).toBe(true);
  for (const event of [
    fromLayout.sidenavClosed(),
    fromAuth.logoutConfirmation(),
    fromAuth.logout(),
  ]) {
    expect(coreState.reducer(opened, event).showSidenav).toBe(false);
  }
});
