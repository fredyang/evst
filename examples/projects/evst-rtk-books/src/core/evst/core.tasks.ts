import { taskOn } from "@evst/rtk";
import { watchIdle } from "../services/idle";
import { fromUser } from "./core.events";

export const coreTasks = taskOn((on) => ({
  // Observes browser activity for the store lifetime to emit idle timeouts.
  idle: on((emit) => watchIdle(() => emit(fromUser.idleTimeoutElapsed()))),
}));
