import { createEvst } from "@evst/rtk";
import { authState } from "./auth/evst/auth.state";
import { authTasks } from "./auth/evst/auth.tasks";
import { coreState } from "./core/evst/core.state";

export const evst = createEvst({
  states: [authState, coreState],
  tasks: [authTasks],
});
