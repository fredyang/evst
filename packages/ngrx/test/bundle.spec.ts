import {
  createEnvironmentInjector,
  ErrorHandler,
  inject,
  ɵINJECTOR_SCOPE,
} from "@angular/core";
import { Actions, ofType } from "@ngrx/effects";
import { createAction, provideStore, Store } from "@ngrx/store";
import { map, withLatestFrom } from "rxjs";
import { expect, expectTypeOf, it } from "vitest";
import { bundle, state, tasks, view, provideEvstStore } from "../src/index.js";

it("registers bundled state and tasks", () => {
  const clicked = createAction("[Counter] Clicked");
  const counted = createAction("[Counter] Counted");
  const counter = state("counter", { count: 0 }).on(counted, (current) => ({
    count: current.count + 1,
  }));
  const counterTasks = tasks((on) => ({
    count: on((actions = inject(Actions)) =>
      actions.pipe(ofType(clicked), map(counted)),
    ),
  }));
  const counterBundle = bundle(counter, counterTasks);
  const injector = createEnvironmentInjector(
    [
      { provide: ɵINJECTOR_SCOPE, useValue: "root" },
      ErrorHandler,
      provideStore(),
      counterBundle.provide(),
    ],
    null!,
  );
  try {
    const store = injector.get(Store);
    store.dispatch(clicked());
    expect(store.selectSignal(counter.views.count)()).toBe(1);
  } finally {
    injector.destroy();
  }
});

it("bundles typed Tasks with current Views without changing the state definition", () => {
  const clicked = createAction("[Bundle] Clicked");
  const counted = createAction("[Bundle] Counted");
  const base = state("bundled", { count: 0 })
    .extraViews(({ count }) => ({ doubled: view(count, (value) => value * 2) }))
    .stateOn((on) => ({
      count: on(counted, (current) => ({ count: current.count + 1 })),
    }));
  const observed: number[] = [];
  const combined = base.taskOn((on, views) => ({
    count: on(clicked, (pipe) =>
      pipe(
        withLatestFrom(views.doubled.observable()),
        map(([, doubled]) => {
          expectTypeOf(doubled).toEqualTypeOf<number>();
          observed.push(doubled);
          return counted();
        }),
      ),
    ),
  }));
  expectTypeOf(combined.effects.count).toBeFunction();
  expectTypeOf(combined.views.doubled).returns.toEqualTypeOf<number>();
  expect(combined.views).toBe(base.views);
  expect(combined.reducer).toBe(base.reducer);
  expect("effects" in base).toBe(false);
  expect(observed).toEqual([]);
  const injector = createEnvironmentInjector(
    [
      { provide: ɵINJECTOR_SCOPE, useValue: "root" },
      ErrorHandler,
      provideEvstStore({ devtools: false }),
      combined.provide(),
    ],
    null!,
  );
  try {
    const store = injector.get(Store);
    store.dispatch(clicked());
    store.dispatch(clicked());
    expect(observed).toEqual([0, 2]);
    expect(store.selectSignal(combined.views.count)()).toBe(2);
    injector.destroy();
    store.dispatch(clicked());
    expect(observed).toEqual([0, 2]);
  } finally {
    if (!injector.destroyed) injector.destroy();
  }
});

it("bundles an empty task collection and validates task definitions", () => {
  const base = state("emptyBundle", { value: 0 });
  expect(base.taskOn(() => ({})).effects).toEqual({});
  expect(() => base.taskOn(() => ({ invalid: {} as never }))).toThrow(
    'Task "invalid" must be created with the supplied on function.',
  );
});
