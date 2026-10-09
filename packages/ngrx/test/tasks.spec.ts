import {
  createEnvironmentInjector,
  ErrorHandler,
  ɵINJECTOR_SCOPE,
} from "@angular/core";
import { createAction, provideStore, Store } from "@ngrx/store";
import { map, of, type Observable } from "rxjs";
import { expect, expectTypeOf, it } from "vitest";
import { task, tasks } from "../src/index.js";

const clicked = createAction("[Test] Clicked");
const doubleClicked = createAction(
  "[Test] Double Clicked",
  (count: number) => ({ count }),
);
const tripleClicked = createAction(
  "[Test] Triple Clicked",
  (label: string) => ({ label }),
);
const quadrupleClicked = createAction(
  "[Test] Quadruple Clicked",
  (active: boolean) => ({ active }),
);
const quintupleClicked = createAction(
  "[Test] Quintuple Clicked",
  (timestamp: number) => ({ timestamp }),
);
const sextupleClicked = createAction(
  "[Test] Sextuple Clicked",
  (source: string) => ({ source }),
);

it("exposes named generated effects", () => {
  const registry = task.handle((on) => ({
    source: on((event = clicked()) => of(event)),
    complete: on(clicked, (pipe) => pipe(map(() => 1))),
  }));

  expect(registry.effects.source).toBeDefined();
  expect(registry.effects.complete).toBeDefined();
});

it("keeps tasks as a compatibility alias", () => {
  expect(
    tasks((on) => ({ complete: on(clicked, (pipe) => pipe()) })).effects,
  ).toHaveProperty("complete");
});

it("forwards options to generated effects", () => {
  const registry = tasks((on) => ({
    source: on(() => of(42), { dispatch: false, functional: false }),
  }));
  const effect = registry.effects.source as unknown as Record<string, unknown>;
  expect(effect["__@ngrx/effects_create__"]).toEqual({
    functional: true,
    dispatch: false,
    useEffectsErrorHandler: true,
  });
});

it("runs event tasks and dispatches their results", () => {
  const completed = createAction("[Test] Completed", (count: number) => ({
    count,
  }));
  const registry = tasks((on) => ({
    complete: on(clicked, doubleClicked, (pipe) =>
      pipe(map((event) => completed("count" in event ? event.count : 1))),
    ),
  }));
  const injector = createEnvironmentInjector(
    [
      { provide: ɵINJECTOR_SCOPE, useValue: "root" },
      ErrorHandler,
      provideStore(),
      registry.provide(),
    ],
    null!,
  );
  try {
    const store = injector.get(Store);
    const emitted: unknown[] = [];
    injector.runInContext(() => {
      const effect = registry.effects.complete as () => Observable<unknown>;
      effect().subscribe((value) => emitted.push(value));
    });
    store.dispatch(clicked());
    store.dispatch(doubleClicked(2));
    expect(emitted).toEqual([completed(1), completed(2)]);
  } finally {
    injector.destroy();
  }
});

it("infers the event union for tasks with more than five event sources", () => {
  tasks((on) => ({
    complete: on(
      clicked,
      doubleClicked,
      tripleClicked,
      quadrupleClicked,
      quintupleClicked,
      sextupleClicked,
      (pipe) =>
        pipe(
          map((event) => {
            expectTypeOf(event).toEqualTypeOf<
              | ReturnType<typeof clicked>
              | ReturnType<typeof doubleClicked>
              | ReturnType<typeof tripleClicked>
              | ReturnType<typeof quadrupleClicked>
              | ReturnType<typeof quintupleClicked>
              | ReturnType<typeof sextupleClicked>
            >();
            return event;
          }),
        ),
    ),
  }));
});

it("rejects values not created by the supplied builder", () => {
  expect(() => tasks(() => ({ invalid: (() => of(1)) as any }))).toThrow(
    "must be created",
  );
});
