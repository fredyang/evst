import { bundle } from "@evst/ngrx";
import { authState } from "./auth/evst/auth.state";
import { authTasks } from "./auth/evst/auth.tasks";
import { coreState } from "./core/evst/core.state";
import { coreTasks } from "./core/evst/core.tasks";

export const rootBundle = bundle(authState, authTasks, coreState, coreTasks);
