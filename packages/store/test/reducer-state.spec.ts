import { combineReducers, createReducer, on, props } from '@ngrx/store';
import { expectTypeOf, it } from 'vitest';
import { createEventGroup, type ReducerState } from '../src/index.js';

it('infers individual and combined reducer state', () => {
  const events = createEventGroup('Counter', { changed: props<{ count: number }>() });
  const counter = createReducer({ count: 0 }, on(events.changed, (_, { count }) => ({ count })));
  const combined = combineReducers({ counter });
  expectTypeOf<ReducerState<typeof counter>>().toEqualTypeOf<{ count: number }>();
  expectTypeOf<ReducerState<typeof combined>>().toEqualTypeOf<{ counter: { count: number } }>();
  expectTypeOf<ReducerState<string>>().toEqualTypeOf<never>();
});
