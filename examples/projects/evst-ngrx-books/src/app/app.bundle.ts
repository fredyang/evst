import { bundle } from "@evst/ngrx-store";
import { authBundle } from "./auth/evst/auth.evst";
import { coreBundle } from "./core/evst/core.evst";

export const rootBundle = bundle(authBundle, coreBundle);
