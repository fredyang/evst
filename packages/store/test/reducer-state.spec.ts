import { combineReducers, createReducer, on, props } from '@ngrx/store';
import { expectTypeOf, it } from 'vitest';
import { events } from '../src/index.js';
import type { ReducerState } from '../src/reducer-state.js';

it('infers individual and combined reducer state', () => {
  const counterEvents = events('Counter', { changed: props<{ count: number }>() });
  const counter = createReducer({ count: 0 }, on(counterEvents.changed, (_, { count }) => ({ count })));
  const combined = combineReducers({ counter });
  expectTypeOf<ReducerState<typeof counter>>().toEqualTypeOf<{ count: number }>();
  expectTypeOf<ReducerState<typeof combined>>().toEqualTypeOf<{ counter: { count: number } }>();
  expectTypeOf<ReducerState<string>>().toEqualTypeOf<never>();
});
