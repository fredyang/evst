import {
  createEnvironmentInjector,
  ErrorHandler,
  inject,
  ɵINJECTOR_SCOPE,
} from "@angular/core";
import { Actions, createEffect, ofType } from "@ngrx/effects";
import {
  createAction,
  createFeature,
  createReducer,
  on,
  provideStore,
  Store,
} from "@ngrx/store";
import { map } from "rxjs";
import { expect, it } from "vitest";
import { provideFeature } from "../src/index.js";

const clicked = createAction("[Counter] Clicked");
const counted = createAction("[Counter] Counted");
const feature = createFeature({
  name: "counter",
  reducer: createReducer(
    0,
    on(counted, (state) => state + 1),
  ),
});
const count = createEffect(
  (actions = inject(Actions)) =>
    actions.pipe(
      ofType(clicked),
      map(() => counted()),
    ),
  { functional: true },
);

class CounterEffects {
  readonly count = createEffect(() =>
    inject(Actions).pipe(
      ofType(clicked),
      map(() => counted()),
    ),
  );
}

it.each([
  ["functional effects", { count }],
  ["class effects", CounterEffects],
] as const)("registers state and %s", (_, effects) => {
  const injector = createEnvironmentInjector(
    [
      // Model an application root so NgRx's providedIn: 'root' services resolve.
      { provide: ɵINJECTOR_SCOPE, useValue: "root" },
      ErrorHandler,
      provideStore(),
      provideFeature(feature, effects),
    ],
    null!,
  );
  try {
    const store = injector.get(Store);
    const value = store.selectSignal(feature.selectCounterState);
    expect(value()).toBe(0);
    store.dispatch(clicked());
    expect(value()).toBe(1);
  } finally {
    injector.destroy();
  }
});

it("registers a lazy feature without effects in the root store", () => {
  const root = createEnvironmentInjector(
    [
      { provide: ɵINJECTOR_SCOPE, useValue: "root" },
      ErrorHandler,
      provideStore(),
    ],
    null!,
  );
  const child = createEnvironmentInjector([provideFeature(feature)], root);
  try {
    const store = root.get(Store);
    expect(store.selectSignal((state) => state)()).toEqual({ counter: 0 });
    store.dispatch(counted());
    expect(store.selectSignal((state) => state)()).toEqual({ counter: 1 });
  } finally {
    if (!child.destroyed) child.destroy();
    root.destroy();
  }
});
