import { fromAuth } from "../../auth/store/auth.events";
import { fromLayout } from "./core.events";
import { coreState } from "./core.state";

describe("coreState", () => {
  it("opens and closes the sidenav in response to layout events", () => {
    const opened = coreState.reducer(undefined, fromLayout.sidenavOpened());
    const closed = coreState.reducer(opened, fromLayout.sidenavClosed());

    expect(opened.showSidenav).toBe(true);
    expect(closed.showSidenav).toBe(false);
  });

  it("closes the sidenav when logout confirmation begins", () => {
    const opened = coreState.reducer(undefined, fromLayout.sidenavOpened());
    const result = coreState.reducer(opened, fromAuth.logoutConfirmation());

    expect(result.showSidenav).toBe(false);
  });
});
