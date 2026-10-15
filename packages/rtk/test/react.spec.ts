import { configureStore, createListenerMiddleware } from "@reduxjs/toolkit";
import { afterEach, describe, expect, expectTypeOf, it } from "vitest";
import {
  clearEvstStore,
  createEvstStore,
  emptyProps,
  events,
  props,
  state,
  taskOn,
  view,
  type NamedStateHandlers,
  type NamedTasks,
} from "../src/index.js";

afterEach(clearEvstStore);

describe("@evst/rtk", () => {
  const fromCounter = events("Counter", {
    added: props<number>(),
    reset: emptyProps(),
  });
  const counter = state("counter", { count: 0 })
    .extraViews(({ count }) => ({ doubled: view(count, (count) => count * 2) }))
    .stateOn((on) => ({
      add: on(fromCounter.added, (state, action) => {
        state.count += action;
      }),
      reset: on(fromCounter.reset, (state) => {
        state.count = 0;
      }),
    }));

  it("creates Redux Toolkit actions and applies event handlers", () => {
    const store = createEvstStore({ states: [counter] });
    expectTypeOf(counter.views.doubled.value()).toEqualTypeOf<number>();
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
    const counterTasks = taskOn(
      (on) =>
        ({
          record: on(fromCounter.added, (action) => {
            observed.push(action);
          }),
          inspectApi: on(fromCounter.added, () => {
            counter.views.count.value() satisfies number;
            return fromCounter.reset();
          }),
        }) satisfies NamedTasks,
    );
    const store = createEvstStore({
      states: [counter],
      tasks: [counterTasks],
    });
    store.dispatch(fromCounter.added(4));
    await Promise.resolve();
    expect(observed).toEqual([4]);
    expect(store.getState()).toEqual({ counter: { count: 0 } });
  });

  it("runs View tasks only on selected value changes and dispatches outcomes", () => {
    const fromObservation = events("Observation", {
      recorded: props<number>(),
    });
    const observation = state("observation", { value: -1 }).stateOn((on) => ({
      record: on(fromObservation.recorded, (current, value) => {
        current.value = value;
      }),
    }));
    const observed: number[] = [];
    const parity = view(counter.views.count, (count) => count % 2);
    const definitions = taskOn((on) => ({
      record: on(parity, (value) => {
        expectTypeOf(value).toEqualTypeOf<number>();
        observed.push(value);
        return fromObservation.recorded(value);
      }),
    }));
    const store = createEvstStore({ states: [counter, observation] });
    store.provide({ tasks: [definitions] });
    store.provide({ tasks: [definitions] });
    expect(observed).toEqual([]);
    fromCounter.added.publish(2);
    expect(observed).toEqual([]);
    fromCounter.added.publish(1);
    expect(observed).toEqual([1]);
    expect(observation.views.value.value()).toBe(1);
    fromCounter.added.publish(1);
    expect(observed).toEqual([1, 0]);
  });

  it("combines multiple typed Views and runs once with a consistent snapshot", async () => {
    const fromSettings = events("Settings", { renamed: props<string>() });
    const settings = state("settings", { name: "initial" }).stateOn((on) => ({
      rename: on(fromSettings.renamed, (current, name) => {
        current.name = name;
      }),
    }));
    const positive = view(counter.views.count, (count) => count > 0);
    const observed: Array<[number, string, boolean]> = [];
    const definitions = taskOn((on) => ({
      observe: on(
        counter.views.count,
        settings.views.name,
        positive,
        async (count, name, isPositive) => {
          expectTypeOf(count).toEqualTypeOf<number>();
          expectTypeOf(name).toEqualTypeOf<string>();
          expectTypeOf(isPositive).toEqualTypeOf<boolean>();
          observed.push([count, name, isPositive]);
        },
      ),
    }));
    createEvstStore({ states: [counter, settings], tasks: [definitions] });
    expect(observed).toEqual([]);
    fromCounter.added.publish(1);
    expect(observed).toEqual([[1, "initial", true]]);
    fromSettings.renamed.publish("updated");
    expect(observed).toEqual([
      [1, "initial", true],
      [1, "updated", true],
    ]);
    fromSettings.renamed.publish("updated");
    fromCounter.added.publish(0);
    expect(observed).toHaveLength(2);
    await Promise.resolve();
  });

  it("stops View tasks and discards pending outcomes on teardown", async () => {
    const listener = createListenerMiddleware();
    const store = configureStore({
      reducer: { counter: counter.reducer },
      middleware: (defaults) => defaults().prepend(listener.middleware),
    });
    const observed: number[] = [];
    let finish!: (outcome: ReturnType<typeof fromCounter.reset>) => void;
    const definitions = taskOn((on) => ({
      record: on(counter.views.count, (value) => {
        observed.push(value);
        return new Promise((resolve) => {
          finish = resolve;
        });
      }),
    }));
    const stop = definitions.register(listener);
    store.dispatch(fromCounter.added(1));
    expect(observed).toEqual([1]);
    stop();
    finish(fromCounter.reset());
    await Promise.resolve();
    await Promise.resolve();
    expect(store.getState().counter.count).toBe(1);
    store.dispatch(fromCounter.added(1));
    expect(observed).toEqual([1]);
  });

  it("starts external sources once and cleans up DOM listeners when cleared", () => {
    const target = new EventTarget();
    let starts = 0;
    let stops = 0;
    let emitLate!: () => void;
    const definitions = taskOn((on) => ({
      clicks: on((emit) => {
        starts++;
        const click = () => emit(fromCounter.added(1));
        emitLate = click;
        target.addEventListener("click", click);
        emit(fromCounter.added(2));
        return () => {
          stops++;
          target.removeEventListener("click", click);
        };
      }),
    }));
    expect(starts).toBe(0);
    const store = createEvstStore({ states: [counter], tasks: [definitions] });
    store.provide({ tasks: [definitions] });
    expect(starts).toBe(1);
    expect(store.getState().counter.count).toBe(2);
    target.dispatchEvent(new Event("click"));
    expect(store.getState().counter.count).toBe(3);
    clearEvstStore();
    clearEvstStore();
    expect(stops).toBe(1);
    target.dispatchEvent(new Event("click"));
    emitLate();
    expect(store.getState().counter.count).toBe(3);
  });

  it("supports source subscriptions without cleanup and rolls back failed collections", () => {
    const listener = createListenerMiddleware();
    const store = configureStore({ reducer: { counter: counter.reducer } });
    let stops = 0;
    const definitions = taskOn((on) => ({
      first: on(() => () => {
        stops++;
      }),
      broken: on(() => {
        throw new Error("Cannot subscribe");
      }),
    }));
    expect(() => definitions.register(listener, store)).toThrow(
      "Cannot subscribe",
    );
    expect(stops).toBe(1);
    const withoutCleanup = taskOn((on) => ({
      once: on((emit) => {
        emit(fromCounter.added(1));
      }),
    }));
    expect(() => withoutCleanup.register(listener)).toThrow("require a store");
    const stop = withoutCleanup.register(listener, store);
    expect(store.getState().counter.count).toBe(1);
    expect(stop).not.toThrow();
    expect(stop).not.toThrow();
  });

  it("bundles typed state, Views and Tasks for root registration", () => {
    const base = state("bundled", { count: 0 })
      .extraViews(({ count }) => ({
        doubled: view(count, (value) => value * 2),
      }))
      .stateOn((on) => ({
        add: on(fromCounter.added, (current, amount) => {
          current.count += amount;
        }),
      }));
    const observed: number[] = [];
    const combined = base.taskOn((on, views) => ({
      record: on(views.doubled, (value) => {
        expectTypeOf(value).toEqualTypeOf<number>();
        observed.push(value);
      }),
    }));
    expectTypeOf(combined.effects.record.register).toBeFunction();
    expectTypeOf(combined.views.doubled).returns.toEqualTypeOf<number>();
    expect(combined.reducer).toBe(base.reducer);
    expect(combined.views).toBe(base.views);
    expect("effects" in base).toBe(false);
    expect("stateOn" in combined).toBe(false);
    createEvstStore({ bundles: [combined] });
    fromCounter.added.publish(3);
    expect(combined.views.doubled.value()).toBe(6);
    expect(observed).toEqual([6]);
  });

  it("registers lazy bundles once, preserves state, rejects collisions, and cleans up sources", () => {
    let starts = 0;
    let stops = 0;
    const combined = state("lazyBundle", { count: 0 })
      .stateOn((on) => ({
        add: on(fromCounter.added, (current, amount) => {
          current.count += amount;
        }),
      }))
      .taskOn((on, views) => ({
        start: on((emit) => {
          starts++;
          expect(views.count.value()).toBe(0);
          emit(fromCounter.added(2));
          return () => {
            stops++;
          };
        }),
      }));
    const store = createEvstStore();
    store.provide({ bundles: [combined] });
    store.provide({ bundles: [combined] });
    expect(starts).toBe(1);
    expect(combined.views.count.value()).toBe(2);
    expect(() =>
      store.provide({
        bundles: [state("lazyBundle", { count: 0 }).taskOn(() => ({}))],
      }),
    ).toThrow("already registered");
    clearEvstStore();
    expect(stops).toBe(1);
  });

  it("rejects conflicting root bundle state names", () => {
    const first = state("same", { value: 0 }).taskOn(() => ({}));
    const second = state("same", { value: 1 }).taskOn(() => ({}));
    expect(() => createEvstStore({ bundles: [first, second] })).toThrow(
      "already registered",
    );
  });

  it("composes state subscriptions without changing earlier definitions", () => {
    const base = state("counter", { count: 0 });
    const first = base.stateOn(
      (on) =>
        ({
          add: on(fromCounter.added, (current, amount) => {
            expectTypeOf(amount).toEqualTypeOf<number>();
            current.count += amount;
          }),
        }) satisfies NamedStateHandlers<{ count: number }>,
    );
    const second = first.stateOn((on) => ({
      reset: on(fromCounter.reset, (current) => {
        current.count = 0;
      }),
    }));
    expect(base.reducer(undefined, fromCounter.added(3))).toEqual({ count: 0 });
    expect(first.reducer({ count: 3 }, fromCounter.reset())).toEqual({
      count: 3,
    });
    expect(second.reducer(undefined, fromCounter.added(3))).toEqual({
      count: 3,
    });
    expect(second.reducer({ count: 3 }, fromCounter.reset())).toEqual({
      count: 0,
    });
    expect(second.views).toBe(base.views);
  });

  it("starts declared Tasks when the collection is registered", () => {
    const observed: number[] = [];
    const pending = taskOn((on) => ({
      record: on(fromCounter.added, (amount) => {
        observed.push(amount);
      }),
    }));
    const evst = createEvstStore({ states: [counter] });
    fromCounter.added.publish(1);
    expect(observed).toEqual([]);
    evst.provide({ tasks: [pending] });
    fromCounter.added.publish(2);
    expect(observed).toEqual([2]);
  });

  it("reads typed current snapshots and derived Views without React", () => {
    const doubled = view(counter.views.count, (count) => count * 2);
    createEvstStore({ states: [counter] });
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
    createEvstStore({ states: [counter] });
    fromCounter.added.publish(4);
    clearEvstStore();
    expect(() => counter.views.count.value()).toThrow(
      "Create an EVST store before reading View values.",
    );
    createEvstStore({ states: [counter] });
    expect(counter.views.count.value()).toBe(0);
  });

  it("publishes every returned outcome independently of completion order", async () => {
    const fromRequest = events("Request", {
      started: props<{ query: string }>(),
      completed: props<{ value: number }>(),
    });
    const result = state("result", { value: 0 }).stateOn((on) => ({
      complete: on(fromRequest.completed, (current, { value }) => {
        expectTypeOf(value).toEqualTypeOf<number>();
        current.value = value;
      }),
    }));
    const pending: Array<{
      resolve(value: number): void;
    }> = [];
    const requests = taskOn((on) => ({
      load: on(fromRequest.started, async ({ query }) => {
        expectTypeOf(query).toEqualTypeOf<string>();
        expectTypeOf(result.views.value.value()).toEqualTypeOf<number>();
        const value = await new Promise<number>((resolve) => {
          pending.push({ resolve });
        });
        return fromRequest.completed({ value });
      }),
    }));
    const store = createEvstStore({ states: [result], tasks: [requests] });
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
        states: [counter],
        tasks: [taskOn(() => ({}))],
      }),
    ).not.toThrow();
  });

  it("provides lazy features once, retains state, and rejects name collisions", () => {
    const evst = createEvstStore({});
    const observed: number[] = [];
    const definitions = taskOn((on) => ({
      observe: on(fromCounter.added, (value) => {
        observed.push(value);
      }),
    }));
    expect(evst.getState()).toEqual({});
    evst.provide({ states: [counter], tasks: [definitions] });
    fromCounter.added.publish(2);
    evst.provide({ states: [counter], tasks: [definitions] });
    fromCounter.added.publish(3);
    expect(counter.views.count.value()).toBe(5);
    expect(observed).toEqual([2, 3]);
    expect(() =>
      evst.provide({ states: [state("counter", { count: 9 })] }),
    ).toThrow("already registered");
    expect(counter.views.count.value()).toBe(5);
  });
});
