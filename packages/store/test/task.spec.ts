import {
  createEnvironmentInjector,
  ErrorHandler,
  inject,
  ɵINJECTOR_SCOPE,
} from "@angular/core";
import { Actions, ofType } from "@ngrx/effects";
import { createAction, provideStore, Store } from "@ngrx/store";
import { of, map, tap } from "rxjs";
import { expect, expectTypeOf, it } from "vitest";
import { task, state as createState } from "../src/index.js";

const clicked = createAction("[Test] Clicked");

it("defers execution and preserves optional source parameters", () => {
  let calls = 0;
  const source = (event = clicked()) => {
    calls++;
    return of(event);
  };
  const effect = task(source);
  expect(effect).toBe(source);
  expect(calls).toBe(0);
  expectTypeOf(effect).parameters.toEqualTypeOf<
    [event?: ReturnType<typeof clicked>]
  >();
  effect(clicked()).subscribe((event) => expect(event).toEqual(clicked()));
  expect(calls).toBe(1);
  expect(effect["__@ngrx/effects_create__"]).toEqual({
    functional: true,
    dispatch: true,
    useEffectsErrorHandler: true,
  });
});

it("overrides functional while forwarding other options", () => {
  const effect = task(() => of(42), {
    functional: false,
    dispatch: false,
    useEffectsErrorHandler: false,
  });
  effect().subscribe((value) => {
    expectTypeOf(value).toEqualTypeOf<number>();
    expect(value).toBe(42);
  });
  expect(effect["__@ngrx/effects_create__"]).toEqual({
    functional: true,
    dispatch: false,
    useEffectsErrorHandler: false,
  });
});

it.each(["standalone", "repeated", "state-owned"] as const)(
  "registers %s effects without duplicate subscriptions",
  (mode) => {
    let subscriptions = 0;
    const counted = createAction("[Test] Counted");
    const effect = task((actions = inject(Actions)) => {
      subscriptions++;
      return actions.pipe(
        ofType(clicked),
        map(() => counted()),
      );
    });
    const state = createState("counter", { count: 0 })
      .on(counted, (state) => ({ count: state.count + 1 }))
      .withTasks(mode === "state-owned" ? [effect] : []);
    const providers = [effect.provide()];
    if (mode === "repeated") providers.push(effect.provide());
    expect(subscriptions).toBe(0);
    const injector = createEnvironmentInjector(
      [
        { provide: ɵINJECTOR_SCOPE, useValue: "root" },
        ErrorHandler,
        provideStore(),
        state.provide(),
        ...providers,
      ],
      null!,
    );
    try {
      const store = injector.get(Store);
      store.dispatch(clicked());
      expect(subscriptions).toBe(1);
      expect(store.selectSignal(state.views.count)()).toBe(1);
    } finally {
      injector.destroy();
    }
  },
);

it("registers a non-dispatching effect in a child environment injector", () => {
  let observed = 0;
  const effect = task(
    (actions = inject(Actions)) =>
      actions.pipe(
        ofType(clicked),
        tap(() => observed++),
        map(() => 42),
      ),
    { dispatch: false },
  );
  const root = createEnvironmentInjector(
    [
      { provide: ɵINJECTOR_SCOPE, useValue: "root" },
      ErrorHandler,
      provideStore(),
    ],
    null!,
  );
  const child = createEnvironmentInjector([effect.provide()], root);
  try {
    root.get(Store).dispatch(clicked());
    expect(observed).toBe(1);
  } finally {
    child.destroy();
    root.destroy();
  }
});
