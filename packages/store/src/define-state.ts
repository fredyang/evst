import {
  createFeatureSelector,
  createReducer,
  createSelector,
  on,
  type ActionCreator,
  type MemoizedSelector,
  type ReducerTypes,
} from "@ngrx/store";
import { provideFeature, type EffectInput } from "./provide-feature.js";

/** Memoized views for each state field, plus the complete state. */
type StateViews<State> = {
  [Key in keyof State]-?: MemoizedSelector<object, State[Key]>;
} & {
  /**
   * Selects the entire state object.
   *
   * Prefer a specific view when only part of the state is needed.
   * The result changes whenever the state reference changes.
   */
  root: MemoizedSelector<object, State>;
};
/** Associates events with pure state handlers, inferring state and payload types. */
type StateOn<State> = <Creators extends readonly ActionCreator[]>(
  ...args: [...Creators, ReducerTypes<State, Creators>["reducer"]]
) => ReducerTypes<State, Creators>;

/** Defines state, memoized views, and registration in one place. */
export function defineState<
  const Name extends string,
  State extends object,
  ExtraViews extends Record<string, MemoizedSelector<object, any>> = {},
>(config: {
  /** Key under which this state is registered. */
  name: Name;
  /** Initial state values. Own enumerable fields receive generated views; root is reserved. */
  initialState: State;
  /** Event handlers that return the next state without mutating the previous state.
   * The callback supplies an on builder with inferred state and event types.
   */
  stateHandlers:
    | readonly ReducerTypes<NoInfer<State>, any>[]
    | ((
        on: StateOn<NoInfer<State>>,
      ) => readonly ReducerTypes<NoInfer<State>, any>[]);
  /** Builds additional named views from the generated views.
   * The view builder is createSelector: calculations receive input values
   * and rerun only when an input changes. Returned names must be unique.
   */
  extraViews?: (
    views: StateViews<NoInfer<State>>,
    view: typeof createSelector,
  ) => ExtraViews;
  /** Effects belonging to this state, registered when provide() is called. */
  effects?: EffectInput;
}) {
  const handlers =
    typeof config.stateHandlers === "function"
      ? config.stateHandlers(on as StateOn<State>)
      : config.stateHandlers;
  const reducer = createReducer(config.initialState, ...handlers);
  const selectState = createFeatureSelector<State>(config.name);
  if (Object.hasOwn(config.initialState, "root")) {
    throw new Error(
      'Feature state cannot contain the reserved view name "root".',
    );
  }
  const defaults = {
    ...Object.fromEntries(
      Object.keys(config.initialState).map((name) => [
        name,
        createSelector(selectState, (state) => state[name as keyof State]),
      ]),
    ),
    root: selectState,
  } as StateViews<State>;
  const extras = config.extraViews?.(defaults, createSelector) ?? {};
  for (const name of Object.keys(extras)) {
    if (Object.hasOwn(defaults, name)) {
      throw new Error(`Extra view "${name}" conflicts with a default view.`);
    }
  }
  const views = { ...defaults, ...extras } as StateViews<State> & ExtraViews;
  const configuredEffects =
    config.effects === undefined ? [] : [config.effects];

  return {
    /** Generated and derived views for reading state, including the complete root view. */
    views,
    /** Helpers for isolated state tests; intended for test code by convention. */
    test: {
      /**
       * Returns the next state for a previous state and an event.
       * Passing undefined as the previous state uses initialState.
       * The event is handled directly; no event is published and no effects run.
       */
      getNextState: reducer,
    },
    /** Registers this state and the effects declared in its definition.
     * Requires provideStore() at the application root.
     */
    provide() {
      return provideFeature(
        { name: config.name, reducer },
        ...configuredEffects,
      );
    },
  };
}
