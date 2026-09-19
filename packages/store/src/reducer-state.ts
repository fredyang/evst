import type { ActionReducer } from '@ngrx/store';

/** Extracts the state returned by a reducer, including combined reducers. */
export type ReducerState<Reducer> =
  Reducer extends ActionReducer<infer State, infer _Action> ? State : never;
