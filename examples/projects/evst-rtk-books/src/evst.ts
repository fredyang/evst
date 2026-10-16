import { createEvstStore } from "@evst/rtk";
import { authBundle } from "./auth/evst/auth.evst";
import { coreBundle } from "./core/evst/core.evst";

export const evst = createEvstStore({
  bundles: [authBundle, coreBundle],
});
