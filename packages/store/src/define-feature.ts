import {
  createFeatureSelector,
  createReducer,
  createSelector,
  on,
  type ActionCreator,
  type MemoizedSelector,
  type ReducerTypes,
} from "@ngrx/store";
import { provideEffects } from "@ngrx/effects";
import { provideFeature } from "./provide-feature.js";

type Effects = Parameters<typeof provideEffects>;
type FeatureViews<State> = {
  [Key in keyof State]-?: MemoizedSelector<object, State[Key]>;
} & { _root: MemoizedSelector<object, State> };
type StateOn<State> = <Creators extends readonly ActionCreator[]>(
  ...args: [...Creators, ReducerTypes<State, Creators>["reducer"]]
) => ReducerTypes<State, Creators>;

/** Defines feature state, memoized views, and registration in one place. */
export function defineFeature<
  const Name extends string,
  State extends object,
  Results extends Record<string, unknown> = {},
>(config: {
  name: Name;
  initialState: State;
  stateHandlers:
    | readonly ReducerTypes<NoInfer<State>, any>[]
    | ((
        on: StateOn<NoInfer<State>>,
      ) => readonly ReducerTypes<NoInfer<State>, any>[]);
  extraViews?: {
    [Key in keyof Results]: (state: NoInfer<State>) => Results[Key];
  };
  effects?: Effects[number] | Effects;
}) {
  const handlers =
    typeof config.stateHandlers === "function"
      ? config.stateHandlers(on as StateOn<State>)
      : config.stateHandlers;
  const reducer = createReducer(config.initialState, ...handlers);
  const selectState = createFeatureSelector<State>(config.name);
  if (Object.hasOwn(config.initialState, "_root")) {
    throw new Error(
      'Feature state cannot contain the reserved view name "_root".',
    );
  }
  const defaults = {
    ...Object.fromEntries(
      Object.keys(config.initialState).map((name) => [
        name,
        createSelector(selectState, (state) => state[name as keyof State]),
      ]),
    ),
    _root: selectState,
  } as FeatureViews<State>;
  for (const name of Object.keys(config.extraViews ?? {})) {
    if (Object.hasOwn(defaults, name)) {
      throw new Error(`Extra view "${name}" conflicts with a default view.`);
    }
  }
  const extras = Object.fromEntries(
    Object.entries(config.extraViews ?? {}).map(([name, project]) => [
      name,
      createSelector(selectState, project as (state: State) => unknown),
    ]),
  );
  const views = { ...defaults, ...extras } as FeatureViews<State> & {
    [Key in keyof Results]: MemoizedSelector<object, Results[Key]>;
  };
  const configuredEffects =
    config.effects === undefined
      ? []
      : Array.isArray(config.effects)
        ? config.effects
        : [config.effects];

  return {
    views,
    /** Utilities for isolated unit tests. */
    testing: { reducer },
    /** Registers this feature and its configured and additional effects.
     * Requires provideStore() at the application root.
     */
    provide(...effects: Effects) {
      return provideFeature(
        { name: config.name, reducer },
        ...configuredEffects,
        ...effects,
      );
    },
  };
}
