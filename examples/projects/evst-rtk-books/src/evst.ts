import { createEvstStore } from "@evst/rtk";
import { authBundle } from "./auth/evst/auth.evst";
import { coreState } from "./core/evst/core.state";
import { coreTasks } from "./core/evst/core.tasks";

export const evst = createEvstStore({
  bundles: [authBundle],
  states: [coreState],
  tasks: [coreTasks],
});
