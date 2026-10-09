import { afterEach, describe, expect, it } from "vitest";
import {
  clearEvstStore,
  createEvstStore,
  emptyProps,
  events,
  props,
  state,
  task,
  view,
} from "../src/index.js";

afterEach(clearEvstStore);

describe("@evst/react", () => {
  const fromCounter = events("Counter", {
    added: props<number>(),
    reset: emptyProps(),
  });
  const counter = state("counter", { count: 0 })
    .extraViews(({ count }) => ({ doubled: view(count, (count) => count * 2) }))
    .handle((on) => ({
      add: on(fromCounter.added, (state, action) => {
        state.count += action.payload;
      }),
      reset: on(fromCounter.reset, (state) => {
        state.count = 0;
      }),
    }));

  it("creates Redux Toolkit actions and applies event handlers", () => {
    const store = createEvstStore({ features: [counter] });
    fromCounter.added.publish(2);
    expect(fromCounter.added(3)).toEqual({
      type: "[Counter] Added",
      payload: 3,
    });
    expect(store.getState()).toEqual({ counter: { count: 2 } });
    expect(counter.views.doubled(store.getState())).toBe(4);
  });

  it("registers tasks through listener middleware", async () => {
    const observed: number[] = [];
    const counterTasks = task.handle((on) => ({
      record: on(fromCounter.added, (action) => {
        observed.push(action.payload);
      }),
    }));
    const store = createEvstStore({
      features: [counter],
      tasks: [counterTasks],
    });
    store.dispatch(fromCounter.added(4));
    await Promise.resolve();
    expect(observed).toEqual([4]);
  });
});
