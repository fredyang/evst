import {
  createEnvironmentInjector,
  ErrorHandler,
  inject,
  ɵINJECTOR_SCOPE,
} from "@angular/core";
import { Actions, createEffect, ofType } from "@ngrx/effects";
import { createAction, on, props, provideStore, Store } from "@ngrx/store";
import { map } from "rxjs";
import { expect, expectTypeOf, it } from "vitest";
import { state as createState, view } from "../src/index.js";

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

it("accepts typed handlers and preserves view memoization", () => {
  let calls = 0;
  const feature = createState("typed", initialState)
    .on(changed, (state: typeof initialState, { amount }) => ({
      ...state,
      count: amount,
    }))
    .withViews(({ count, loading }) => ({
      doubled: view(count, (count) => {
        expectTypeOf(count).toEqualTypeOf<number>();
        calls++;
        return count * 2;
      }),
      status: view(count, loading, (count, loading) => {
        expectTypeOf(loading).toEqualTypeOf<boolean>();
        return loading ? "Loading…" : `${count} items`;
      }),
    }))
    .withTasks({ increment });
  const state = { typed: initialState };
  expect(feature.views.root(state)).toBe(initialState);
  expect(feature.views.count(state)).toBe(0);
  expect(feature.views.loading(state)).toBe(false);
  expectTypeOf(feature.views.doubled).returns.toEqualTypeOf<number>();
  expect(feature.views.doubled(state)).toBe(0);
  expect(feature.views.doubled({ ...state })).toBe(0);
  expect(calls).toBe(1);
  expect(
    feature.views.doubled({ typed: { ...initialState, loading: true } }),
  ).toBe(0);
  expect(calls).toBe(1);
  expect(feature.views.status(state)).toBe("0 items");
  expect(
    feature.views.status({ typed: { ...initialState, loading: true } }),
  ).toBe("Loading…");
  expectTypeOf(feature.views.status).returns.toEqualTypeOf<string>();
  expect(feature.views.doubled({ typed: { ...initialState, count: 3 } })).toBe(
    6,
  );
  expect(calls).toBe(2);
  expect(feature.reducer(undefined, changed({ amount: 7 })).count).toBe(7);
});

it("creates standalone views that compose feature views", () => {
  const users = createState("users", {
    users: [{ id: "user-1", name: "Ada" }],
    selectedId: "user-1" as string | null,
  });
  const orders = createState("orders", {
    orders: [{ id: "order-1", userId: "user-1", amount: 12 }],
  });
  const selectedUserWithOrders = view(
    users.views.users,
    users.views.selectedId,
    orders.views.orders,
    (users, selectedId, orders) => {
      const user = users.find((user) => user.id === selectedId);
      return user
        ? {
            ...user,
            orders: orders.filter((order) => order.userId === user.id),
          }
        : null;
    },
  );

  expect(
    selectedUserWithOrders({
      users: users.reducer(undefined, { type: "init" }),
      orders: orders.reducer(undefined, { type: "init" }),
    }),
  ).toEqual({
    id: "user-1",
    name: "Ada",
    orders: [{ id: "order-1", userId: "user-1", amount: 12 }],
  });
  expectTypeOf(selectedUserWithOrders.signal).returns.toEqualTypeOf<
    import("@angular/core").Signal<{
      id: string;
      name: string;
      orders: { id: string; userId: string; amount: number }[];
    } | null>
  >();
});

it("reuses derived arrays until a declared dependency changes", () => {
  let calls = 0;
  const book = { id: "one" };
  const initial = {
    books: { one: book },
    search: { ids: ["one"] },
    collection: [] as string[],
  };
  const feature = createState("books", initial).withViews(
    ({ books, search }) => ({
      results: view(books, search, (books, search) => {
        calls++;
        return search.ids.map((id) => books[id as keyof typeof books]);
      }),
    }),
  );
  const resultsView = feature.views.results;
  expectTypeOf(resultsView).returns.toEqualTypeOf<{ id: string }[]>();
  const first = resultsView({ books: initial });
  expect(first).toEqual([book]);
  expect(resultsView({ books: { ...initial, collection: ["one"] } })).toBe(
    first,
  );
  expect(calls).toBe(1);
  const searching = { ...initial, search: { ids: [] } };
  expect(resultsView({ books: searching })).toEqual([]);
  expect(calls).toBe(2);
  const updated = { ...initial, books: { one: { id: "updated" } } };
  expect(resultsView({ books: updated })).toEqual([{ id: "updated" }]);
  expect(calls).toBe(3);
  resultsView.release();
  resultsView({ books: updated });
  expect(calls).toBe(4);
  const override = [{ id: "mock" }];
  resultsView.setResult(override);
  expect(resultsView({ books: initial })).toBe(override);
  resultsView.clearResult();
  expect(resultsView({ books: initial })).toEqual([book]);
});

it("composes views and preserves the projector type", () => {
  const feature = createState("counter", initialState).withViews(
    ({ count, loading }) => {
      const doubled = view(count, (count) => count * 2);
      return {
        doubled,
        status: view(doubled, loading, (value, loading) =>
          loading ? "Loading" : String(value),
        ),
      };
    },
  );
  expectTypeOf(feature.views.doubled.projector).parameters.toEqualTypeOf<
    [number]
  >();
  expectTypeOf(feature.views.doubled.projector).returns.toEqualTypeOf<number>();
  expect(feature.views.status({ counter: { count: 3, loading: false } })).toBe(
    "6",
  );
  expect(feature.views.status({ counter: { count: 3, loading: true } })).toBe(
    "Loading",
  );
});

function definition() {
  return createState("counter", initialState)
    .on(changed, (state, { amount }) => {
      expectTypeOf(state).toEqualTypeOf<typeof initialState>();
      expectTypeOf(amount).toEqualTypeOf<number>();
      return { ...state, count: state.count + amount };
    })
    .withTasks({ increment });
}

it("infers state, payloads, views, and the reducer", () => {
  const feature = definition();
  expectTypeOf<keyof typeof feature>().toEqualTypeOf<
    | "effects"
    | "views"
    | "reducer"
    | "provide"
    | "on"
    | "withViews"
    | "withTasks"
  >();
  expectTypeOf(feature.reducer).returns.toEqualTypeOf<typeof initialState>();
  expect(Object.keys(feature).sort()).toEqual([
    "effects",
    "on",
    "provide",
    "reducer",
    "views",
    "withTasks",
    "withViews",
  ]);
  expectTypeOf(feature.views.count).returns.toEqualTypeOf<number>();
  expectTypeOf(feature.views.loading).returns.toEqualTypeOf<boolean>();
  expect(feature.reducer(undefined, changed({ amount: 3 }))).toEqual({
    count: 3,
    loading: false,
  });
  const state = { counter: { count: 4, loading: true } };
  expect(feature.views.count(state)).toBe(4);
  expect(feature.views.loading(state)).toBe(true);
  expect(feature.views.root(state)).toBe(state.counter);
});

it("derives views from multiple state values with inferred types", () => {
  const feature = createState("books", {
    query: "",
    books: [] as { title: string }[],
  }).withViews(({ query, books }) => ({
    filteredBooks: view(query, books, (query, books) => {
      expectTypeOf(query).toEqualTypeOf<string>();
      expectTypeOf(books).toEqualTypeOf<{ title: string }[]>();
      return books.filter((book) => book.title.includes(query));
    }),
  }));
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
  expect(() => createState("reserved", { root: 1 })).toThrow(
    'reserved view name "root"',
  );
  expect(() =>
    createState("collision", initialState).withViews(({ count }) => ({
      count,
    })),
  ).toThrow("conflicts with an existing view");
});

it("registers all effects from the state definition", () => {
  const more = createAction("[Counter] More");
  const extra = createEffect(
    (actions = inject(Actions)) =>
      actions.pipe(
        ofType(more),
        map(() => changed({ amount: 3 })),
      ),
    { functional: true },
  );
  const feature = createState("counter", initialState)
    .on(changed, (state, { amount }) => ({
      ...state,
      count: state.count + amount,
    }))
    .withTasks([{ increment }, { extra }]);
  expectTypeOf(feature.provide).parameters.toEqualTypeOf<[]>();
  const injector = createEnvironmentInjector(
    [
      { provide: ɵINJECTOR_SCOPE, useValue: "root" },
      ErrorHandler,
      provideStore(),
      feature.provide(),
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
