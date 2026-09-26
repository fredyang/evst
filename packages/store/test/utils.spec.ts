import {
  APP_INITIALIZER,
  createEnvironmentInjector,
  ErrorHandler,
  runInInjectionContext,
  signal,
  ɵINJECTOR_SCOPE,
} from "@angular/core";
import { Store } from "@ngrx/store";
import { of, type Observable } from "rxjs";
import { afterEach, expect, expectTypeOf, it, vi } from "vitest";
import { state as createState, view } from "../src/index.js";
import { provideStoreSugar } from "../src/provide-store-sugar.js";

const injectors: ReturnType<typeof createEnvironmentInjector>[] = [];
afterEach(() => {
  for (const injector of injectors.splice(0)) injector.destroy();
});

function createViewContext() {
  const selected = signal(1);
  const mock = {
    dispatch: vi.fn(),
    select: vi.fn(() => of(1)),
    selectSignal: vi.fn(() => selected),
  };
  const injector = createEnvironmentInjector(
    [
      { provide: ɵINJECTOR_SCOPE, useValue: "root" },
      ErrorHandler,
      provideStoreSugar({ devtools: false }),
      { provide: Store, useValue: mock },
    ],
    null!,
  );
  injectors.push(injector);
  runInInjectionContext(injector, () => {
    for (const initialize of injector.get(APP_INITIALIZER)) initialize();
  });
  return { mock, selected };
}

it("requires Sugar Store registration before reading views", () => {
  const feature = createState("counter", { count: 0 });

  expect(() => feature.views.count.signal()).toThrow("provideStoreSugar");
  expect(() => feature.views.count.observable()).toThrow("provideStoreSugar");
});

it("reads generated and derived views with inferred signal types and equality options", () => {
  const { mock, selected } = createViewContext();
  const feature = createState("counter", { count: 0 }).withViews(
    ({ count }) => ({ doubled: view(count, (count) => count * 2) }),
  );
  const countView = feature.views.count;
  const options = { equal: (a: number, b: number) => a === b };
  const value = countView.signal(options);
  expectTypeOf(value()).toEqualTypeOf<number>();
  expect(value()).toBe(1);
  expect(mock.selectSignal).toHaveBeenCalledWith(countView, options);
  selected.set(2);
  expect(value()).toBe(2);

  const memoized = feature.views.doubled;
  const derived = memoized.signal();
  expectTypeOf(derived()).toEqualTypeOf<number>();
  expect(mock.selectSignal).toHaveBeenCalledWith(memoized, undefined);

  const standalone = view(feature.views.count, (count) => count * 3);
  const standaloneSignal = standalone.signal();
  expectTypeOf(standaloneSignal()).toEqualTypeOf<number>();
  expect(mock.selectSignal).toHaveBeenCalledWith(standalone, undefined);
});

it("creates observable views without an injection context", () => {
  const { mock } = createViewContext();
  const feature = createState("counter", { count: 0 }).withViews(
    ({ count }) => ({ doubled: view(count, (count) => count * 2) }),
  );
  const countView = feature.views.count;
  const value$ = countView.observable();
  const next = vi.fn();
  value$.subscribe((value) => {
    expectTypeOf(value).toEqualTypeOf<number>();
    next(value);
  });
  expect(next).toHaveBeenCalledWith(1);
  expect(mock.select).toHaveBeenCalledWith(countView);
});

it("attaches typed injection methods to root, field, and derived views", () => {
  const feature = createState("counter", { count: 0 }).withViews(
    ({ count }) => ({
      doubled: view(count, (value) => value * 2),
    }),
  );
  expectTypeOf<ReturnType<typeof feature.views.root.signal>>().toEqualTypeOf<
    import("@angular/core").Signal<{ count: number }>
  >();
  expectTypeOf<ReturnType<typeof feature.views.count.signal>>().toEqualTypeOf<
    import("@angular/core").Signal<number>
  >();
  expectTypeOf<
    ReturnType<typeof feature.views.doubled.observable>
  >().toEqualTypeOf<import("rxjs").Observable<number>>();
  const { mock, selected } = createViewContext();
  const options = { equal: (a: number, b: number) => a === b };
  const value = feature.views.doubled.signal(options);
  expect(value()).toBe(1);
  expect(mock.selectSignal).toHaveBeenCalledWith(
    feature.views.doubled,
    options,
  );
  const other = feature.views.doubled.signal();
  selected.set(3);
  expect(other()).toBe(3);
  expect(value()).toBe(3);
  for (const view of [
    feature.views.root,
    feature.views.count,
    feature.views.doubled,
  ]) {
    view.signal();
    expect(mock.selectSignal).toHaveBeenLastCalledWith(view, undefined);
    const next = vi.fn();
    const values: Observable<unknown> = view.observable();
    values.subscribe(next);
    expect(next).toHaveBeenCalledWith(1);
    expect(mock.select).toHaveBeenLastCalledWith(view);
  }
});
