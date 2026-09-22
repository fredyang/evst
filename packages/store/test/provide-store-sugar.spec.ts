import {
  APP_INITIALIZER,
  createEnvironmentInjector,
  ErrorHandler,
  isDevMode,
  runInInjectionContext,
  ɵINJECTOR_SCOPE,
} from "@angular/core";
import { Store, emptyProps, props } from "@ngrx/store";
import { INITIAL_OPTIONS } from "@ngrx/store-devtools";
import { afterEach, expect, expectTypeOf, it, vi } from "vitest";
import { events, state, provideStoreSugar } from "../src/index.js";
import { injectPublish } from "../src/inject-publish.js";

const page = events("Page", {
  entered: emptyProps(),
  selected: props<{ id: string }>(),
  searched: (query: string, page: number = 1) => ({ query, page }),
});
const injectors: ReturnType<typeof createEnvironmentInjector>[] = [];
afterEach(() => {
  for (const injector of injectors.splice(0).reverse())
    if (!injector.destroyed) injector.destroy();
});
function context(store = { dispatch: vi.fn() }) {
  const injector = createEnvironmentInjector(
    [
      provideStoreSugar({ devtools: false }),
      { provide: Store, useValue: store },
    ],
    null!,
  );
  injectors.push(injector);
  const initialize = () =>
    runInInjectionContext(injector, () => {
      for (const init of injector.get(APP_INITIALIZER)) init();
    });
  return { injector, store, initialize };
}

it("uses a recognizable default DevTools name in development", () => {
  expect(isDevMode()).toBe(true);

  const defaults = createEnvironmentInjector(
    [ErrorHandler, provideStoreSugar()],
    null!,
  );
  injectors.push(defaults);
  const custom = createEnvironmentInjector(
    [ErrorHandler, provideStoreSugar({ devtools: { name: "Books" } })],
    null!,
  );
  injectors.push(custom);
  const disabled = createEnvironmentInjector(
    [ErrorHandler, provideStoreSugar({ devtools: false })],
    null!,
  );
  injectors.push(disabled);

  expect(defaults.get(INITIAL_OPTIONS).name).toBe("NgRx Sugar Store");
  expect(custom.get(INITIAL_OPTIONS).name).toBe("Books");
  expect(disabled.get(INITIAL_OPTIONS, null)).toBeNull();
});

it("provides and captures an empty root Store", () => {
  const injector = createEnvironmentInjector(
    [provideStoreSugar({ devtools: false })],
    null!,
  );
  injectors.push(injector);
  const store = injector.get(Store);
  expect(store.selectSignal((value) => value)()).toEqual({});
  const dispatch = vi.spyOn(store, "dispatch");
  runInInjectionContext(injector, () => {
    for (const init of injector.get(APP_INITIALIZER)) init();
  });

  page.entered.publish();

  expect(dispatch).toHaveBeenCalledWith(page.entered());
});

it("publishes through a registered feature and forwards root configuration", () => {
  const feature = state("selection", { id: "" }).on(
    page.selected,
    (_state, { id }) => ({ id }),
  );
  const observed = vi.fn();
  const injector = createEnvironmentInjector(
    [
      { provide: ɵINJECTOR_SCOPE, useValue: "root" },
      ErrorHandler,
      provideStoreSugar({
        devtools: false,
        metaReducers: [
          (reducer) => (value, event) => {
            observed(event);
            return reducer(value, event);
          },
        ],
        runtimeChecks: { strictActionSerializability: true },
      }),
      feature.provide(),
    ],
    null!,
  );
  injectors.push(injector);
  runInInjectionContext(injector, () => {
    for (const init of injector.get(APP_INITIALIZER)) init();
  });
  const selected = runInInjectionContext(injector, () =>
    feature.views.id.signal(),
  );
  page.selected.publish({ id: "42" });
  expect(selected()).toBe("42");
  expect(observed).toHaveBeenCalledWith(page.selected({ id: "42" }));
});

it("requires initialization and keeps created events plain", () => {
  expect(page.entered()).toEqual({ type: "[Page] Entered" });
  expect(page.entered()).not.toHaveProperty("publish");
  expect(() => page.entered.publish()).toThrow("provideStoreSugar");
  const app = context();
  expect(() => page.entered.publish()).toThrow("provideStoreSugar");
  app.initialize();
  page.entered.publish();
  page.selected.publish({ id: "42" });
  page.searched.publish("Angular", 2);
  expect(app.store.dispatch.mock.calls.map(([event]) => event)).toEqual([
    page.entered(),
    page.selected({ id: "42" }),
    page.searched("Angular", 2),
  ]);
  expectTypeOf(page.selected.publish).parameters.toEqualTypeOf<
    [{ id: string }]
  >();
  expectTypeOf(page.entered.publish).returns.toEqualTypeOf<void>();
});
it("rejects another active store without replacing the first and allows scoped publishing", () => {
  const first = context();
  first.initialize();
  const second = context();
  expect(second.initialize).toThrow("already has an active Store");
  second.injector.destroy();
  page.entered.publish();
  expect(first.store.dispatch).toHaveBeenCalledOnce();
  const isolated = context();
  const publish = runInInjectionContext(isolated.injector, injectPublish);
  publish(page.entered());
  expect(isolated.store.dispatch).toHaveBeenCalledWith(page.entered());
});
it("retains same-store registrations until all owners are destroyed", () => {
  const first = context();
  first.initialize();
  const second = context(first.store);
  second.initialize();
  first.injector.destroy();
  page.entered.publish();
  second.injector.destroy();
  expect(() => page.entered.publish()).toThrow("provideStoreSugar");
  const next = context();
  next.initialize();
  page.entered.publish();
  expect(next.store.dispatch).toHaveBeenCalledOnce();
});
function invalidPayloads() {
  // @ts-expect-error A payload is required.
  page.selected.publish();
  // @ts-expect-error Payload fields retain their types.
  page.selected.publish({ id: 42 });
  // @ts-expect-error Empty events accept no arguments.
  page.entered.publish({});
  // @ts-expect-error Custom creator arguments retain their types.
  page.searched.publish(42);
}
expectTypeOf(invalidPayloads).toBeFunction();
