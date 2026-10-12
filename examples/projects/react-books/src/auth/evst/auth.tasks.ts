import { task } from "@evst/rtk";
import { fromUser } from "../../core/evst/core.events";
import { fromAuth, fromAuthApi, fromLoginPage } from "./auth.events";

export const authTasks = task.handle((on) => ({
  login: on(fromLoginPage.login, ({ credentials }) => {
    // Matches the Angular example's demo authentication; no backend session.
    if (!["ngrx", "test"].includes(credentials.username)) {
      return fromAuthApi.loginFailure({
        error: "Invalid username or password",
      });
    }
    return fromAuthApi.loginSuccess({ user: { name: "User" } });
  }),
  logoutIdleUser: on(fromUser.idleTimeoutElapsed, () => fromAuth.logout()),
}));
