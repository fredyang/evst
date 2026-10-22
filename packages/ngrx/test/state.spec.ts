import {
  createEnvironmentInjector,
  ErrorHandler,
  inject,
  ɵINJECTOR_SCOPE,
} from "@angular/core";
import { Actions, createEffect, ofType, provideEffects } from "@ngrx/effects";
import { createAction, props, provideStore, Store } from "@ngrx/store";
import { map } from "rxjs";
import { expect, expectTypeOf, it, vi } from "vitest";
import { evst, view, type NamedStateHandlers } from "../src/index.js";

const add = createAction("[Counter] Add", props<{ amount: number }>());
const other = createAction("[Counter] Other", props<{ amount: number }>());
it("infers handlers and preserves independent branches", () => {
  const base = evst("counter", { count: 0 });
  const plus = base.state((on) => ({
    handler1: on(add, other, (state, event) => {
      expectTypeOf(state).toEqualTypeOf<{ count: number }>();
      expectTypeOf(event.amount).toEqualTypeOf<number>();
      return { count: state.count + event.amount };
    }),
  }));
  const minus = base.state((on) => ({
    handler2: on(add, (state, { amount }) => ({
      count: state.count - amount,
    })),
  }));
  expect(base.reducer(undefined, add({ amount: 3 })).count).toBe(0);
  expect(plus.reducer(undefined, other({ amount: 3 })).count).toBe(3);
  expect(minus.reducer(undefined, add({ amount: 3 })).count).toBe(-3);
  expect(plus.views.count).toBe(base.views.count);
});
it("creates reducers from named handlers", () => {
  const counter = evst("namedCounter", { count: 0 }).state((on) => ({
    addAmount: on(add, (current, { amount }) => {
      expectTypeOf(current).toEqualTypeOf<{ count: number }>();
      expectTypeOf(amount).toEqualTypeOf<number>();
      return { count: current.count + amount };
    }),
    subtractAmount: on(other, (current, { amount }) => ({
      count: current.count - amount,
    })),
  }));
  expect(counter.reducer(undefined, add({ amount: 3 }))).toEqual({ count: 3 });
  expect(counter.reducer({ count: 3 }, other({ amount: 1 }))).toEqual({
    count: 2,
  });
});
it("composes subscriptions without changing earlier definitions or views", () => {
  const base = evst("counter", { count: 0 });
  const first = base.state(
    (on) =>
      ({
        add: on(add, (current, { amount }) => ({
          count: current.count + amount,
        })),
      }) satisfies NamedStateHandlers<{ count: number }>,
  );
  const second = first.state((on) => ({
    subtract: on(other, (current, { amount }) => ({
      count: current.count - amount,
    })),
  }));

  expect(base.reducer(undefined, add({ amount: 3 }))).toEqual({ count: 0 });
  expect(first.reducer({ count: 3 }, other({ amount: 1 }))).toEqual({
    count: 3,
  });
  expect(second.reducer(undefined, add({ amount: 3 }))).toEqual({ count: 3 });
  expect(second.reducer({ count: 3 }, other({ amount: 1 }))).toEqual({
    count: 2,
  });
  expect(second.views).toBe(base.views);
});
it("composes successive extra views once and retains their types and caches", () => {
  const build = vi.fn();
  const base = evst("counter", { count: 0 });
  const first = base.view(({ count }) => {
    build();
    return { doubled: view(count, (n) => n * 2) };
  });
  const next = first
    .view(({ doubled }) => ({
      text: view(doubled, (n) => String(n)),
    }))
    .state((on) => ({
      handler3: on(add, (s, { amount }) => ({ count: s.count + amount })),
    }));
  expect(build).toHaveBeenCalledOnce();
  expect(base.views).not.toHaveProperty("doubled");
  expect(first.views).not.toHaveProperty("text");
  expect(next.views.doubled).toBe(first.views.doubled);
  expect(next.views.text({ counter: { count: 3 } })).toBe("6");
  expectTypeOf(next.views.doubled.projector).parameters.toEqualTypeOf<
    [number]
  >();
  expectTypeOf(next.views.doubled.signal).returns.toEqualTypeOf<
    import("@angular/core").Signal<number>
  >();
  expectTypeOf(next.views.text.observable).returns.toEqualTypeOf<
    import("rxjs").Observable<string>
  >();
  expect(() => first.view(({ count }) => ({ count }))).toThrow("conflicts");
  expect(() => first.view(({ doubled }) => ({ doubled }))).toThrow("conflicts");
  expect(() => evst("bad", { root: 0 })).toThrow("reserved");
});
it("registers state and effects independently", () => {
  const trigger = createAction("[Counter] Trigger");
  const effect = (amount: number) =>
    createEffect(
      (actions = inject(Actions)) =>
        actions.pipe(
          ofType(trigger),
          map(() => add({ amount })),
        ),
      { functional: true },
    );
  const base = evst("counter", { count: 0 }).state((on) => ({
    handler4: on(add, (s, { amount }) => ({
      count: s.count + amount,
    })),
  }));
  const definition = base;
  const injector = createEnvironmentInjector(
    [
      { provide: ɵINJECTOR_SCOPE, useValue: "root" },
      ErrorHandler,
      provideStore(),
      definition.provide(),
      provideEffects({ first: effect(2), second: effect(3) }),
    ],
    null!,
  );
  try {
    const store = injector.get(Store);
    store.dispatch(trigger());
    expect(store.selectSignal(definition.views.count)()).toBe(5);
  } finally {
    injector.destroy();
  }
});

it("checks inferred state transition return types", () => {
  const initial = {
    count: 0,
    search: { query: "", loading: false },
    results: [] as { id: string }[],
  };
  const base = evst("exactState", initial);
  const valid = base.state((on) => ({
    update: on(add, other, (state, event) => {
      expectTypeOf(state).toEqualTypeOf<typeof initial>();
      expectTypeOf(event).toEqualTypeOf<
        ReturnType<typeof add> | ReturnType<typeof other>
      >();
      return {
        ...state,
        count: state.count + event.amount,
        search: { ...state.search, loading: true },
        results: [{ id: "book" }],
      };
    }),
  }));
  expect(valid.reducer(undefined, add({ amount: 2 })).count).toBe(2);

  function invalidTransitions() {
    base.state((on) => ({
      // @ts-expect-error Inferred returns cannot add top-level fields.
      extra: on(add, (state) => ({ ...state, typo: true })),
      nested: on(other, (state) => ({
        ...state,
        // @ts-expect-error Inferred returns cannot add nested fields.
        search: { ...state.search, name: "fred" },
      })),
    }));
    base.state((on) => ({
      // @ts-expect-error State fields cannot be omitted.
      missing: on(add, () => ({ count: 1 })),
      // @ts-expect-error State fields must retain their declared types.
      wrongType: on(other, (state) => ({ ...state, count: "one" })),
    }));
    base.state((on) => ({
      array: on(add, (state) => ({
        ...state,
        // @ts-expect-error Array items cannot add fields.
        results: [{ id: "book", typo: true }],
      })),
    }));
  }
  expectTypeOf(invalidTransitions).toBeFunction();
});

it("accepts optional fields, unions, dictionaries, and unchanged state", () => {
  interface State {
    status: { kind: "idle" } | { kind: "ready"; value: number };
    label?: string;
    byId: Record<string, { value: number }>;
    updated: Date;
  }
  const initial: State = {
    status: { kind: "idle" },
    byId: {},
    updated: new Date(0),
  };
  const base = evst("stateShapes", initial);
  const feature = base.state((on) => ({
    update: on(add, (state, { amount }) => ({
      ...state,
      status: { kind: "ready", value: amount },
      byId: { book: { value: amount } },
    })),
    reset: on(other, (): State => initial),
  }));
  expect(feature.reducer(undefined, add({ amount: 2 })).status).toEqual({
    kind: "ready",
    value: 2,
  });
  expect(feature.reducer(initial, other({ amount: 0 }))).toBe(initial);
});
