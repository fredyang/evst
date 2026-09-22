import { createAction, props } from "@ngrx/store";
import { state as createState } from "../../src/index.js";
import { increment } from "./circular-effects.js";

const counted = createAction("[Circular] Counted", props<{ count: number }>());
export const circularState = createState("circular", { count: 0 })
  .on(counted, (_state, { count }) => ({ count }))
  .effects([increment]);
