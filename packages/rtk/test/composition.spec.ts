import { afterEach, expect, expectTypeOf, it, vi } from "vitest";
import { Tuple, type Middleware, type StoreEnhancer } from "@reduxjs/toolkit";
import {
  clearEvstStore,
  createEvstStore,
  events,
  evst,
  props,
  task,
  view,
} from "../src/index.js";

afterEach(clearEvstStore);
const fromCounter = events("Composition", {
  add: props<number>(),
  reset: props<number>(),
});

it("accumulates views, handlers and tasks in any order without rebuilding earlier callbacks", () => {
  const firstSeen: number[] = [],
    secondSeen: string[] = [];
  const build = vi.fn();
  const base = evst("counter", { count: 0 });
  const first = base
    .view(({ count }) => ({ doubled: view(count, (n) => n * 2) }))
    .state((on) => ({
      add: on(fromCounter.add, (s, n) => {
        s.count += n;
      }),
    }))
    .task((on, views) => {
      build();
      expect(views).not.toHaveProperty("text");
      return {
        first: on(fromCounter.add, () => {
          firstSeen.push(views.doubled.snapshot);
        }),
      };
    });
  const final = first
    .view(({ doubled }) => ({ text: view(doubled, (n) => `${n}!`) }))
    .task((on, views) => ({
      second: on(fromCounter.add, () => {
        expectTypeOf(views.text.snapshot).toEqualTypeOf<string>();
        secondSeen.push(views.text.snapshot);
      }),
    }))
    .state((on) => ({
      reset: on(fromCounter.reset, (s, n) => {
        s.count = n;
      }),
    }));
  expectTypeOf(final.effects).toHaveProperty("first");
  expectTypeOf(final.effects).toHaveProperty("second");
  expectTypeOf(base).not.toHaveProperty("effects");
  expectTypeOf(final).not.toHaveProperty("on");
  expect(first.views).not.toHaveProperty("text");
  expect(first.effects).not.toHaveProperty("second");
  expect(final.effects.first).toBe(first.effects.first);
  expect(build).toHaveBeenCalledOnce();
  const store = createEvstStore(final);
  expectTypeOf(store.getState()).toEqualTypeOf<{
    counter: { count: number };
  }>();
  fromCounter.add.publish(2);
  expect(firstSeen).toEqual([4]);
  expect(secondSeen).toEqual(["4!"]);
  fromCounter.reset.publish(8);
  expect(final.views.count.snapshot).toBe(8);
});

it("rejects duplicate labels, event types, and view names across extensions", () => {
  const base = evst("counter", { count: 0 })
    .state((on) => ({ add: on(fromCounter.add, (s) => s) }))
    .task((on) => ({ save: on(fromCounter.add, () => {}) }));
  expect(() =>
    base.state((on) => ({ add: on(fromCounter.reset, (s) => s) })),
  ).toThrow('State handler "add"');
  const alias = events("Composition", { add: props<number>() });
  expect(() =>
    base.state((on) => ({ another: on(alias.add, (s) => s) })),
  ).toThrow("already handled");
  expect(() =>
    base.task((on) => ({ save: on(fromCounter.reset, () => {}) })),
  ).toThrow('Task "save"');
  expect(() => base.view(({ count }) => ({ count }))).toThrow('View "count"');
  expect(() => base.view(({ count }) => ({ root: count }))).toThrow(
    'View "root"',
  );
  const withView = base.view(({ count }) => ({
    double: view(count, (n) => n * 2),
  }));
  expect(() => withView.view(({ double }) => ({ double }))).toThrow(
    'View "double"',
  );
  expect(() =>
    base.task((on) => ({ other: on(fromCounter.add, () => {}) })),
  ).not.toThrow();
});

it("composes standalone views from different feature roots", () => {
  const auth = evst("auth", { loggedIn: true });
  const books = evst("books", { title: "Book" });
  const summary = view(
    auth.views.loggedIn,
    books.views.title,
    (loggedIn, title) => {
      expectTypeOf(loggedIn).toEqualTypeOf<boolean>();
      expectTypeOf(title).toEqualTypeOf<string>();
      return loggedIn ? title : "";
    },
  );
  const store = createEvstStore(auth, books);
  expect(summary(store.getState())).toBe("Book");
  expectTypeOf(summary.snapshot).toEqualTypeOf<string>();
});

it("passes trailing options through and composes custom middleware with task listeners", () => {
  const feature = evst("counter", { count: 0 }).state((on) => ({
    add: on(fromCounter.add, (s, n) => {
      s.count += n;
    }),
  }));
  const calls: unknown[] = [],
    outcomes: number[] = [];
  const middleware: Middleware = () => (next) => (action) => {
    calls.push(action);
    return next(action);
  };
  const tasks = task((on) => ({
    observe: on(fromCounter.add, (n) => {
      outcomes.push(n);
    }),
  }));
  const store = createEvstStore(feature, tasks, {
    preloadedState: { counter: { count: 10 } },
    devTools: false,
    middleware: (defaults) => defaults().concat(middleware),
  });
  const unsubscribe = store.subscribe(vi.fn());
  const result = store.dispatch((dispatch, getState) => {
    expectTypeOf(getState().counter.count).toEqualTypeOf<number>();
    dispatch(fromCounter.add(2));
    return getState().counter.count;
  });
  expectTypeOf(result).toEqualTypeOf<number>();
  expect(result).toBe(12);
  expect(calls).toContainEqual(fromCounter.add(2));
  expect(outcomes).toEqual([2]);
  unsubscribe();
});

it("preserves enhancer extensions in the returned store type", () => {
  const enhancer: StoreEnhancer<{ answer: () => number }> =
    (next) =>
    (...args) => ({ ...next(...args), answer: () => 42 });
  const store = createEvstStore(evst("example", { value: 1 }), {
    enhancers: (defaults) => defaults().concat(enhancer),
  });
  expectTypeOf(store.answer()).toEqualTypeOf<number>();
  expect(store.answer()).toBe(42);
});

it("preserves standard replaceReducer behavior and accepts middleware without defaults", () => {
  const store = createEvstStore(evst("counter", { count: 0 }), {
    middleware: () => new Tuple(),
  });
  store.replaceReducer((state = { counter: { count: 0 } }, action) =>
    action.type === "override" ? { counter: { count: 9 } } : state,
  );
  store.dispatch({ type: "override" });
  expect(store.getState().counter.count).toBe(9);
});

it("registers accumulated task identities only once and cleans up failed startup", () => {
  const starts = vi.fn(),
    stops = vi.fn();
  const base = evst("counter", { count: 0 }).task((on) => ({
    source: on(() => {
      starts();
      return stops;
    }),
  }));
  const final = base
    .view(({ count }) => ({ doubled: view(count, (n) => n * 2) }))
    .task(() => ({}));
  const store = createEvstStore(base);
  store.provide(final);
  expect(starts).toHaveBeenCalledOnce();
  clearEvstStore();
  expect(stops).toHaveBeenCalledOnce();
  const broken = task((on) => ({
    source: on(() => {
      throw new Error("failed");
    }),
  }));
  expect(() => createEvstStore(base, broken)).toThrow("failed");
  expect(stops).toHaveBeenCalledTimes(2);
  expect(() => createEvstStore(base)).not.toThrow();
});

// Compile-only checks for the public breaking change and positional options.
function checkPublicTypes() {
  const feature = evst("counter", { count: 0 });
  expectTypeOf<typeof import("../src/index.js")>().not.toHaveProperty("state");
  expectTypeOf<typeof import("../src/index.js")>().not.toHaveProperty("taskOn");
  expectTypeOf<typeof import("../src/index.js")>().not.toHaveProperty("tasks");
  // @ts-expect-error Store options belong after every definition.
  createEvstStore({ devTools: false }, feature);
  // @ts-expect-error Preloaded state must match the feature state.
  createEvstStore(feature, { preloadedState: { counter: { count: "wrong" } } });
  // @ts-expect-error EVST constructs the reducer from feature definitions.
  createEvstStore(feature, { reducer: feature.reducer });
  // @ts-expect-error The former configuration object API has been removed.
  createEvstStore({ states: [feature] });
}
void checkPublicTypes;
