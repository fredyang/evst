import { bundle } from "@evst/ngrx";
import { authBundle } from "./auth/evst/auth.evst";
import { coreState } from "./core/evst/core.state";
import { coreTasks } from "./core/evst/core.tasks";

export const rootBundle = bundle(authBundle, coreState, coreTasks);
