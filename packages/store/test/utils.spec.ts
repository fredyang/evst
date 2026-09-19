import { createEnvironmentInjector, runInInjectionContext, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { afterEach, expect, expectTypeOf, it, vi } from 'vitest';
import { injectEventBus } from '../src/index.js';

const injectors: ReturnType<typeof createEnvironmentInjector>[] = [];
afterEach(() => {
  for (const injector of injectors.splice(0)) injector.destroy();
});

function createBus() {
  const mock = {
    dispatch: vi.fn(),
    select: vi.fn(() => of(1)),
    selectSignal: vi.fn(() => signal(1)),
  };
  const injector = createEnvironmentInjector([{ provide: Store, useValue: mock }], null!);
  injectors.push(injector);
  const bus = runInInjectionContext(injector, () => injectEventBus<{ count: number }>());
  return { bus, mock };
}

it('selects state and publishes events', () => {
  const { bus, mock } = createBus();
  const selector = (state: { count: number }) => state.count;
  const options = { equal: (a: number, b: number) => a === b };
  const value = bus.signal(selector, options);
  expectTypeOf(value()).toEqualTypeOf<number>();
  expect(value()).toBe(1);
  expect(mock.selectSignal).toHaveBeenCalledWith(selector, options);
  bus.observable(selector).subscribe(value => expect(value).toBe(1));
  expect(mock.select).toHaveBeenCalledWith(selector);
  const event = { type: '[Test] Clicked' };
  bus.publish(event);
  expect(mock.dispatch).toHaveBeenCalledWith(event);
});

it('keeps event buses isolated without initializing global helpers', () => {
  const first = createBus();
  const second = createBus();
  const event = { type: '[Test] Clicked' };
  first.bus.publish(event);
  expect(first.mock.dispatch).toHaveBeenCalledWith(event);
  expect(second.mock.dispatch).not.toHaveBeenCalled();
  second.bus.publish(event);
  expect(second.mock.dispatch).toHaveBeenCalledWith(event);

  const selector = (state: { count: number }) => state.count;
  const options = { equal: (a: number, b: number) => a === b };
  const selected = first.bus.signal(selector, options);
  expectTypeOf(selected()).toEqualTypeOf<number>();
  expect(selected()).toBe(1);
  expect(first.mock.selectSignal).toHaveBeenCalledWith(selector, options);
  first.bus.observable(selector).subscribe(value => {
    expectTypeOf(value).toEqualTypeOf<number>();
    expect(value).toBe(1);
  });
  expect(first.mock.select).toHaveBeenCalledWith(selector);
  function invalidSelector() {
    // @ts-expect-error The selector must accept the bus state.
    first.bus.signal((state: { name: string }) => state.name);
  }
  expectTypeOf(invalidSelector).toBeFunction();
});
