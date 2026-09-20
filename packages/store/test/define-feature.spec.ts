import {
  createEnvironmentInjector,
  ErrorHandler,
  inject,
  ɵINJECTOR_SCOPE,
} from "@angular/core";
import { Actions, createEffect, ofType } from "@ngrx/effects";
import {
  createAction,
  on,
  props,
  provideStore,
  Store,
} from "@ngrx/store";
import { map } from "rxjs";
import { expect, expectTypeOf, it } from "vitest";
import { defineFeature } from "../src/index.js";

const clicked = createAction("[Counter] Clicked");
const changed = createAction("[Counter] Changed", props<{ amount: number }>());
const initialState = { count: 0, loading: false };
const increment = createEffect(
  (actions = inject(Actions)) =>
    actions.pipe(
      ofType(clicked),
      map(() => changed({ amount: 2 })),
    ),
  { functional: true },
);

it("accepts typed handler arrays and preserves view memoization", () => {
  let calls = 0;
  const feature = defineFeature({
    name: "typed",
    initialState,
    stateHandlers: [
      on(changed, (state: typeof initialState, { amount }) => ({
        ...state,
        count: amount,
      })),
    ],
    extraViews: {
      doubled: ({ count }) => {
        expectTypeOf(count).toEqualTypeOf<number>();
        calls++;
        return count * 2;
      },
      status: ({ count, loading }) => {
        expectTypeOf(loading).toEqualTypeOf<boolean>();
        return loading ? "Loading…" : `${count} items`;
      },
    },
    effects: { increment },
  });
  const state = { typed: initialState };
  expect(feature.views._root(state)).toBe(initialState);
  expect(feature.views.count(state)).toBe(0);
  expect(feature.views.loading(state)).toBe(false);
  expectTypeOf(feature.views.doubled).returns.toEqualTypeOf<number>();
  expect(feature.views.doubled(state)).toBe(0);
  expect(feature.views.doubled({ ...state })).toBe(0);
  expect(calls).toBe(1);
  expect(
    feature.views.doubled({ typed: { ...initialState, loading: true } }),
  ).toBe(0);
  expect(calls).toBe(2);
  expect(feature.views.status(state)).toBe("0 items");
  expect(feature.views.status({ typed: { ...initialState, loading: true } })).toBe("Loading…");
  expectTypeOf(feature.views.status).returns.toEqualTypeOf<string>();
  expect(feature.views.doubled({ typed: { ...initialState, count: 3 } })).toBe(
    6,
  );
  expect(calls).toBe(3);
  expect(feature.testing.reducer(undefined, changed({ amount: 7 })).count).toBe(7);
});

function definition() {
  return defineFeature({
    name: "counter",
    initialState,
    stateHandlers: (on) => [
      on(changed, (state, { amount }) => {
        expectTypeOf(state).toEqualTypeOf<typeof initialState>();
        expectTypeOf(amount).toEqualTypeOf<number>();
        return { ...state, count: state.count + amount };
      }),
    ],
    effects: { increment },
  });
}

it("infers state, payloads, views, and the test reducer", () => {
  const feature = definition();
  expectTypeOf<keyof typeof feature>().toEqualTypeOf<"views" | "provide" | "testing">();
  expectTypeOf(feature.testing.reducer).returns.toEqualTypeOf<typeof initialState>();
  expect(Object.keys(feature).sort()).toEqual(["provide", "testing", "views"]);
  expectTypeOf(feature.views.count).returns.toEqualTypeOf<number>();
  expectTypeOf(feature.views.loading).returns.toEqualTypeOf<boolean>();
  expect(feature.testing.reducer(undefined, changed({ amount: 3 }))).toEqual({
    count: 3,
    loading: false,
  });
  const state = { counter: { count: 4, loading: true } };
  expect(feature.views.count(state)).toBe(4);
  expect(feature.views.loading(state)).toBe(true);
  expect(feature.views._root(state)).toBe(state.counter);
});

it("derives views from multiple state values with inferred types", () => {
  const feature = defineFeature({
    name: "books",
    initialState: { query: "", books: [] as { title: string }[] },
    stateHandlers: [],
    extraViews: {
      filteredBooks: ({ query, books }) => {
        expectTypeOf(query).toEqualTypeOf<string>();
        expectTypeOf(books).toEqualTypeOf<{ title: string }[]>();
        return books.filter((book) => book.title.includes(query));
      },
    },
  });
  expectTypeOf(feature.views.filteredBooks).returns.toEqualTypeOf<
    { title: string }[]
  >();
  expect(
    feature.views.filteredBooks({
      books: {
        query: "Angular",
        books: [{ title: "Angular" }, { title: "RxJS" }],
      },
    }),
  ).toEqual([{ title: "Angular" }]);
});

it("rejects collisions with generated views", () => {
  expect(() =>
    defineFeature({
      name: "reserved",
      initialState: { _root: 1 },
      stateHandlers: [],
    }),
  ).toThrow('reserved view name "_root"');
  expect(() =>
    defineFeature({
      name: "collision",
      initialState,
      stateHandlers: [],
      extraViews: { count: ({ count }) => count },
    }),
  ).toThrow("conflicts with a default view");
});

it("registers configured and additional effects with feature state", () => {
  const feature = definition();
  const more = createAction("[Counter] More");
  const extra = createEffect(
    (actions = inject(Actions)) =>
      actions.pipe(
        ofType(more),
        map(() => changed({ amount: 3 })),
      ),
    { functional: true },
  );
  const injector = createEnvironmentInjector(
    [
      { provide: ɵINJECTOR_SCOPE, useValue: "root" },
      ErrorHandler,
      provideStore(),
      feature.provide({ extra }),
    ],
    null!,
  );
  try {
    const store = injector.get(Store);
    const value = store.selectSignal(feature.views.count);
    expect(value()).toBe(0);
    store.dispatch(clicked());
    expect(value()).toBe(2);
    store.dispatch(more());
    expect(value()).toBe(5);
  } finally {
    injector.destroy();
  }
});
