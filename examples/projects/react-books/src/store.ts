import { createEvstStore } from "@evst/react";
import { authState } from "./auth/evst/auth.state";
import { authTasks } from "./auth/evst/auth.tasks";
import { coreState } from "./core/evst/core.state";

export const store = createEvstStore({
  features: [authState, coreState],
  tasks: [authTasks],
});
