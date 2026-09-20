import { createAction } from '@ngrx/store';
import { of } from 'rxjs';
import { expect, expectTypeOf, it } from 'vitest';
import { functionalEffect } from '../src/index.js';

const clicked = createAction('[Test] Clicked');

it('defers execution and preserves optional source parameters', () => {
  let calls = 0;
  const source = (event = clicked()) => {
    calls++;
    return of(event);
  };
  const effect = functionalEffect(source);
  expect(effect).toBe(source);
  expect(calls).toBe(0);
  expectTypeOf(effect).parameters.toEqualTypeOf<[event?: ReturnType<typeof clicked>]>();
  effect(clicked()).subscribe(event => expect(event).toEqual(clicked()));
  expect(calls).toBe(1);
  expect(effect['__@ngrx/effects_create__']).toEqual({
    functional: true, dispatch: true, useEffectsErrorHandler: true,
  });
});

it('overrides functional while forwarding other options', () => {
  const effect = functionalEffect(() => of(42), {
    functional: false, dispatch: false, useEffectsErrorHandler: false,
  });
  effect().subscribe(value => {
    expectTypeOf(value).toEqualTypeOf<number>();
    expect(value).toBe(42);
  });
  expect(effect['__@ngrx/effects_create__']).toEqual({
    functional: true, dispatch: false, useEffectsErrorHandler: false,
  });
});
