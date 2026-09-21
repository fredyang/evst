import {
  APP_INITIALIZER,
  createEnvironmentInjector,
  runInInjectionContext,
} from "@angular/core";
import { Store, emptyProps, props } from "@ngrx/store";
import { afterEach, expect, expectTypeOf, it, vi } from "vitest";
import { events, injectPublish, provideStoreSugar } from "../src/index.js";

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
    [{ provide: Store, useValue: store }, provideStoreSugar()],
    null!,
  );
  injectors.push(injector);
  const initialize = () =>
    runInInjectionContext(injector, () => {
      for (const init of injector.get(APP_INITIALIZER)) init();
    });
  return { injector, store, initialize };
}
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
