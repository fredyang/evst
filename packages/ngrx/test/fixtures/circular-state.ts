import { createAction, props } from "@ngrx/store";
import { evst as createState } from "../../src/index.js";

const counted = createAction("[Circular] Counted", props<{ count: number }>());
export const circularState = createState("circular", { count: 0 }).state(
  (on) => ({ handler1: on(counted, (_state, { count }) => ({ count })) }),
);
