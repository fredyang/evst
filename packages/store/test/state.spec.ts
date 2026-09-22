import {
  createEnvironmentInjector,
  ErrorHandler,
  inject,
  ɵINJECTOR_SCOPE,
} from "@angular/core";
import { Actions, createEffect, ofType } from "@ngrx/effects";
import { createAction, props, provideStore, Store } from "@ngrx/store";
import { map } from "rxjs";
import { expect, expectTypeOf, it, vi } from "vitest";
import { state } from "../src/index.js";

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
  expect(base.test.getNextState(undefined, add({ amount: 3 })).count).toBe(0);
  expect(plus.test.getNextState(undefined, other({ amount: 3 })).count).toBe(3);
  expect(minus.test.getNextState(undefined, add({ amount: 3 })).count).toBe(-3);
  expect(plus.views.count).toBe(base.views.count);
});
it("composes successive extra views once and retains their types and caches", () => {
  const build = vi.fn();
  const base = state("counter", { count: 0 });
  const first = base.withViews(({ count }, view) => {
    build();
    return { doubled: view(count, (n) => n * 2) };
  });
  const next = first
    .withViews(({ doubled }, view) => ({
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
  expect(() => first.withViews(({ count }) => ({ count }))).toThrow(
    "conflicts",
  );
  expect(() => first.withViews(({ doubled }) => ({ doubled }))).toThrow(
    "conflicts",
  );
  expect(() => state("bad", { root: 0 })).toThrow("reserved");
});
it("registers chained handlers and appends effects", () => {
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
  const definition = base.withEffects(effect(2)).withEffects(effect(3));
  const injector = createEnvironmentInjector(
    [
      { provide: ɵINJECTOR_SCOPE, useValue: "root" },
      ErrorHandler,
      provideStore(),
      definition.provide(),
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
