import { createEnvironmentInjector, runInInjectionContext, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { of, type Observable } from 'rxjs';
import { afterEach, expect, expectTypeOf, it, vi } from 'vitest';
import { defineState, injectPublish } from '../src/index.js';

const injectors: ReturnType<typeof createEnvironmentInjector>[] = [];
afterEach(() => {
  for (const injector of injectors.splice(0)) injector.destroy();
});

function createContext() {
  const selected = signal(1);
  const mock = {
    dispatch: vi.fn(),
    select: vi.fn(() => of(1)),
    selectSignal: vi.fn(() => selected),
  };
  const injector = createEnvironmentInjector([{ provide: Store, useValue: mock }], null!);
  injectors.push(injector);
  return { mock, selected, run: <T>(fn: () => T) => runInInjectionContext(injector, fn) };
}

it('reads generated and derived views with inferred signal types and equality options', () => {
  const { run, mock, selected } = createContext();
  const feature = defineState({
    name: 'counter',
    initialState: { count: 0 },
    stateHandlers: [],
    extraViews: ({ count }, view) => ({ doubled: view(count, count => count * 2) }),
  });
  const view = feature.views.count;
  const options = { equal: (a: number, b: number) => a === b };
  const value = run(() => view.signal(options));
  expectTypeOf(value()).toEqualTypeOf<number>();
  expect(value()).toBe(1);
  expect(mock.selectSignal).toHaveBeenCalledWith(view, options);
  selected.set(2);
  expect(value()).toBe(2);

  const memoized = feature.views.doubled;
  const derived = run(() => memoized.signal());
  expectTypeOf(derived()).toEqualTypeOf<number>();
  expect(mock.selectSignal).toHaveBeenCalledWith(memoized, undefined);
});

it('creates observable views during injection for later subscription', () => {
  const { run, mock } = createContext();
  const feature = defineState({
    name: 'counter',
    initialState: { count: 0 },
    stateHandlers: [],
    extraViews: ({ count }, view) => ({ doubled: view(count, count => count * 2) }),
  });
  const view = feature.views.count;
  const value$ = run(() => view.observable());
  const next = vi.fn();
  value$.subscribe(value => {
    expectTypeOf(value).toEqualTypeOf<number>();
    next(value);
  });
  expect(next).toHaveBeenCalledWith(1);
  expect(mock.select).toHaveBeenCalledWith(view);
});

it('publishes outside injection context using the captured store', () => {
  const first = createContext();
  const second = createContext();
  const publishFirst = first.run(injectPublish);
  const publishSecond = second.run(injectPublish);
  const event = { type: '[Test] Clicked', count: 2 };
  publishFirst(event);
  expect(first.mock.dispatch).toHaveBeenCalledWith(event);
  expect(second.mock.dispatch).not.toHaveBeenCalled();
  publishSecond(event);
  expect(second.mock.dispatch).toHaveBeenCalledWith(event);
});

it('requires an injection context when creating helpers', () => {
  expect(() => injectPublish()).toThrow();
});

it('attaches typed injection methods to root, field, and derived views', () => {
  const feature = defineState({
    name: 'counter',
    initialState: { count: 0 },
    stateHandlers: [],
    extraViews: ({ count }, view) => ({
      doubled: view(count, value => value * 2),
    }),
  });
  expectTypeOf<ReturnType<typeof feature.views.root.signal>>().toEqualTypeOf<import('@angular/core').Signal<{ count: number }>>();
  expectTypeOf<ReturnType<typeof feature.views.count.signal>>().toEqualTypeOf<import('@angular/core').Signal<number>>();
  expectTypeOf<ReturnType<typeof feature.views.doubled.observable>>().toEqualTypeOf<import('rxjs').Observable<number>>();
  const first = createContext();
  const second = createContext();
  const options = { equal: (a: number, b: number) => a === b };
  const value = first.run(() => feature.views.doubled.signal(options));
  expect(value()).toBe(1);
  expect(first.mock.selectSignal).toHaveBeenCalledWith(feature.views.doubled, options);
  const other = second.run(() => feature.views.doubled.signal());
  second.selected.set(3);
  expect(other()).toBe(3);
  expect(value()).toBe(1);
  for (const view of [feature.views.root, feature.views.count, feature.views.doubled]) {
    first.run(() => view.signal());
    expect(first.mock.selectSignal).toHaveBeenLastCalledWith(view, undefined);
    const next = vi.fn();
    const values: Observable<unknown> = first.run(() => view.observable());
    values.subscribe(next);
    expect(next).toHaveBeenCalledWith(1);
    expect(first.mock.select).toHaveBeenLastCalledWith(view);
    expect(() => view.signal()).toThrow();
    expect(() => view.observable()).toThrow();
  }
});
