import {
  createEnvironmentInjector,
  ErrorHandler,
  ɵINJECTOR_SCOPE,
} from "@angular/core";
import { provideStore, Store } from "@ngrx/store";
import { expect, it } from "vitest";
import { circularState } from "./fixtures/circular-state.js";
import { circularTasks } from "./fixtures/circular-tasks.js";

it("reads views after a circularly imported functional effect is initialized", () => {
  const injector = createEnvironmentInjector(
    [
      { provide: ɵINJECTOR_SCOPE, useValue: "root" },
      ErrorHandler,
      provideStore(),
      circularState.provide(),
      circularTasks.provide(),
    ],
    null!,
  );
  try {
    const store = injector.get(Store);
    store.dispatch({ type: "[Circular] Clicked" });
    store.dispatch({ type: "[Circular] Clicked" });
    expect(store.selectSignal(circularState.views.count)()).toBe(2);
  } finally {
    injector.destroy();
  }
});
