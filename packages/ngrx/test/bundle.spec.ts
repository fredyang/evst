import {
  createEnvironmentInjector,
  ErrorHandler,
  inject,
  ɵINJECTOR_SCOPE,
} from "@angular/core";
import { Actions, ofType } from "@ngrx/effects";
import { createAction, provideStore, Store } from "@ngrx/store";
import { map } from "rxjs";
import { expect, it } from "vitest";
import { bundle, state, tasks } from "../src/index.js";

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
