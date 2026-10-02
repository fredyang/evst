import { fromAuth } from "../../auth/store/auth.events";
import { fromLayout } from "./core.events";
import { coreState } from "./core.state";

describe("coreState", () => {
  const coreReducer = coreState.reducer;

  it("opens and closes the sidenav in response to layout events", () => {
    const opened = coreReducer(undefined, fromLayout.sidenavOpened());
    const closed = coreReducer(opened, fromLayout.sidenavClosed());

    expect(opened.showSidenav).toBe(true);
    expect(closed.showSidenav).toBe(false);
  });

  it("closes the sidenav when logout confirmation begins", () => {
    const opened = coreReducer(undefined, fromLayout.sidenavOpened());
    const closed = coreReducer(opened, fromAuth.logoutConfirmation());

    expect(closed.showSidenav).toBe(false);
  });
});
