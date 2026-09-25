import {
  createEnvironmentInjector,
  ErrorHandler,
  inject,
  ɵINJECTOR_SCOPE,
} from "@angular/core";
import { Actions, ofType } from "@ngrx/effects";
import { createAction, provideStore, Store } from "@ngrx/store";
import { catchError, of, map, switchMap, tap, type Observable } from "rxjs";
import { expect, expectTypeOf, it } from "vitest";
import { tasks, state as createState } from "../src/index.js";

const clicked = createAction("[Test] Clicked");

it("defers execution and preserves optional source parameters", () => {
  let calls = 0;
  const source = (event = clicked()) => {
    calls++;
    return of(event);
  };
  const effect = tasks.on(source);
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
  const effect = tasks.on(() => of(42), {
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
    const effect = tasks.on((actions = inject(Actions)) => {
      subscriptions++;
      return actions.pipe(
        ofType(clicked),
        map(() => counted()),
      );
    });
    const registry = tasks().on(effect);
    const state = createState("counter", { count: 0 })
      .on(counted, (state) => ({ count: state.count + 1 }))
      .withTasks(mode === "state-owned" ? registry : []);
    const providers = [registry.provide()];
    if (mode === "repeated") providers.push(registry.provide());
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
  const effect = tasks.on(
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
  const child = createEnvironmentInjector([tasks().on(effect).provide()], root);
  try {
    root.get(Store).dispatch(clicked());
    expect(observed).toBe(1);
  } finally {
    child.destroy();
    root.destroy();
  }
});

it("builds event-driven tasks without exposing Actions or ofType", () => {
  const completed = createAction("[Test] Completed");
  const registry = tasks().on(clicked, (pipe) => pipe(map(() => completed())));
  const effect = registry.toList()[0] as () => Observable<unknown>;
  const injector = createEnvironmentInjector(
    [
      { provide: ɵINJECTOR_SCOPE, useValue: "root" },
      ErrorHandler,
      provideStore(),
    ],
    null!,
  );
  try {
    const emitted: unknown[] = [];
    injector.runInContext(() => {
      effect().subscribe((event) => emitted.push(event));
    });
    injector.get(Store).dispatch(clicked());
    expect(emitted).toEqual([completed()]);
  } finally {
    injector.destroy();
  }
});

it("types each event-driven operator from the preceding operator", () => {
  const loaded = createAction("[Test] Loaded", (books: string[]) => ({
    books,
  }));
  const failed = createAction("[Test] Failed", (error: unknown) => ({ error }));

  tasks.on(clicked, (pipe) =>
    pipe(
      switchMap(() => of(["The Left Hand of Darkness"])),
      map((books) => {
        expectTypeOf(books).toEqualTypeOf<string[]>();
        return loaded(books);
      }),
      catchError((error) => of(failed(error))),
    ),
  );
});
