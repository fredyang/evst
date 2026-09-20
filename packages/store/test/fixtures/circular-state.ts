import { createAction, props } from "@ngrx/store";
import { defineState } from "../../src/index.js";
import { increment } from "./circular-effects.js";

const counted = createAction("[Circular] Counted", props<{ count: number }>());
export const circularState = defineState({
  name: "circular",
  initialState: { count: 0 },
  stateHandlers: (on) => [on(counted, (_state, { count }) => ({ count }))],
  effects: [increment],
});
