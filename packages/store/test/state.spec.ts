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
import { state, view } from "../src/index.js";

const add = createAction("[Counter] Add", props<{ amount: number }>());
const other = createAction("[Counter] Other", props<{ amount: number }>());
it("infers handlers and preserves independent branches", () => {
  const base = state("counter", { count: 0 });
  const plus = base.on(add, other, (state, event) => {
    expectTypeOf(state).toEqualTypeOf<{ count: number }>();
    expectTypeOf(event.amount).toEqualTypeOf<number>();
    return { count: state.count + event.amount };
  });
  const minus = base.on(add, (state, { amount }) => ({
    count: state.count - amount,
  }));
  expect(base.reducer(undefined, add({ amount: 3 })).count).toBe(0);
  expect(plus.reducer(undefined, other({ amount: 3 })).count).toBe(3);
  expect(minus.reducer(undefined, add({ amount: 3 })).count).toBe(-3);
  expect(plus.views.count).toBe(base.views.count);
});
it("creates reducers from named handlers", () => {
  const counter = state("namedCounter", { count: 0 }).handle((on) => ({
    addAmount: on(add, (current, { amount }) => ({
      count: current.count + amount,
    })),
    subtractAmount: on(other, (current, { amount }) => ({
      count: current.count - amount,
    })),
  }));
  expect(counter.reducer(undefined, add({ amount: 3 }))).toEqual({ count: 3 });
  expect(counter.reducer({ count: 3 }, other({ amount: 1 }))).toEqual({
    count: 2,
  });
});
it("composes successive extra views once and retains their types and caches", () => {
  const build = vi.fn();
  const base = state("counter", { count: 0 });
  const first = base.extraViews(({ count }) => {
    build();
    return { doubled: view(count, (n) => n * 2) };
  });
  const next = first
    .extraViews(({ doubled }) => ({
      text: view(doubled, (n) => String(n)),
    }))
    .on(add, (s, { amount }) => ({ count: s.count + amount }));
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
  expect(() => first.extraViews(({ count }) => ({ count }))).toThrow(
    "conflicts",
  );
  expect(() => first.extraViews(({ doubled }) => ({ doubled }))).toThrow(
    "conflicts",
  );
  expect(() => state("bad", { root: 0 })).toThrow("reserved");
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
  const base = state("counter", { count: 0 }).on(add, (s, { amount }) => ({
    count: s.count + amount,
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
