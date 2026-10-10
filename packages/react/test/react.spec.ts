import { afterEach, describe, expect, expectTypeOf, it } from "vitest";
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
        state.count += action;
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
        observed.push(action);
      }),
      inspectApi: on(fromCounter.added, () => {
        counter.views.count.value() satisfies number;
        return fromCounter.reset();
      }),
    }));
    const store = createEvstStore({
      features: [counter],
      tasks: [counterTasks],
    });
    store.dispatch(fromCounter.added(4));
    await Promise.resolve();
    expect(observed).toEqual([4]);
    expect(store.getState()).toEqual({ counter: { count: 0 } });
  });

  it("reads typed current snapshots and derived Views without React", () => {
    const doubled = view(counter.views.count, (count) => count * 2);
    createEvstStore({ features: [counter] });
    expectTypeOf(counter.views.count.value()).toEqualTypeOf<number>();
    expectTypeOf(doubled.value()).toEqualTypeOf<number>();
    expect(counter.views.count.value()).toBe(0);
    fromCounter.added.publish(3);
    expect(counter.views.count.value()).toBe(3);
    expect(counter.views.root.value()).toEqual({ count: 3 });
    expect(doubled.value()).toBe(6);
  });

  it("requires an active store and reads the replacement after clearing", () => {
    expect(() => counter.views.count.value()).toThrow(
      "Create an EVST store before reading View values.",
    );
    createEvstStore({ features: [counter] });
    fromCounter.added.publish(4);
    clearEvstStore();
    expect(() => counter.views.count.value()).toThrow(
      "Create an EVST store before reading View values.",
    );
    createEvstStore({ features: [counter] });
    expect(counter.views.count.value()).toBe(0);
  });

  it("publishes every returned outcome independently of completion order", async () => {
    const fromRequest = events("Request", {
      started: props<{ query: string }>(),
      completed: props<{ value: number }>(),
    });
    const result = state("result", { value: 0 }).handle((on) => ({
      complete: on(fromRequest.completed, (current, { value }) => {
        expectTypeOf(value).toEqualTypeOf<number>();
        current.value = value;
      }),
    }));
    const pending: Array<{
      resolve(value: number): void;
    }> = [];
    const requests = task.handle((on) => ({
      load: on(fromRequest.started, async ({ query }) => {
        expectTypeOf(query).toEqualTypeOf<string>();
        expectTypeOf(result.views.value.value()).toEqualTypeOf<number>();
        const value = await new Promise<number>((resolve) => {
          pending.push({ resolve });
        });
        return fromRequest.completed({ value });
      }),
    }));
    const store = createEvstStore({ features: [result], tasks: [requests] });
    fromRequest.started.publish({ query: "first" });
    fromRequest.started.publish({ query: "second" });
    pending[1].resolve(2);
    await Promise.resolve();
    await Promise.resolve();
    expect(result.views.value(store.getState())).toBe(2);
    // The older operation finishes after the newer operation.
    pending[0].resolve(1);
    await Promise.resolve();
    await Promise.resolve();
    expect(result.views.value(store.getState())).toBe(1);
  });

  it("registers and stops an empty task collection", () => {
    expect(() =>
      createEvstStore({
        features: [counter],
        tasks: [task.handle(() => ({}))],
      }),
    ).not.toThrow();
  });

  it("provides lazy features once, retains state, and rejects name collisions", () => {
    const store = createEvstStore({});
    const observed: number[] = [];
    const definitions = task.handle((on) => ({
      observe: on(fromCounter.added, (value) => {
        observed.push(value);
      }),
    }));
    expect(store.getState()).toEqual({});
    store.provide({ features: [counter], tasks: [definitions] });
    fromCounter.added.publish(2);
    store.provide({ features: [counter], tasks: [definitions] });
    fromCounter.added.publish(3);
    expect(counter.views.count.value()).toBe(5);
    expect(observed).toEqual([2, 3]);
    expect(() =>
      store.provide({ features: [state("counter", { count: 9 })] }),
    ).toThrow("already registered");
    expect(counter.views.count.value()).toBe(5);
  });
});
