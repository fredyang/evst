import { bundle } from "@evst/store";
import { authState } from "./auth/store/auth.state";
import { authTasks } from "./auth/store/auth.tasks";
import { coreState } from "./core/store/core.state";
import { coreTasks } from "./core/store/core.tasks";

export const rootBundle = bundle(authState, authTasks, coreState, coreTasks);
