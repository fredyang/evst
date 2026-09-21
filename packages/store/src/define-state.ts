import { inject, type Signal } from "@angular/core";
import type { Observable } from "rxjs";
import {
  Store,
  createFeatureSelector,
  createReducer,
  createSelector,
  on,
  type ActionCreator,
  type MemoizedSelector,
  type ReducerTypes,
  type SelectSignalOptions,
} from "@ngrx/store";
import { provideFeature, type EffectInput } from "./provide-feature.js";
import type { Event } from "./events.js";

/** Injection helpers attached to each exposed view. */
type ViewMethods<Result> = {
  /** Reads this view as a signal in the current injection context. */
  signal(options?: SelectSignalOptions<Result>): Signal<Result>;
  /** Reads this view as an observable in the current injection context. */
  observable(): Observable<Result>;
};

/** Adds signal and observable access to each named memoized view. */
type InjectableViews<Views extends Record<string, MemoizedSelector<object, any>>> = {
  [Key in keyof Views]: Views[Key] & ViewMethods<ReturnType<Views[Key]>>;
};

function attachViewMethods<View extends MemoizedSelector<object, any>>(view: View) {
  return Object.assign(view, {
    signal: (options?: SelectSignalOptions<ReturnType<View>>) =>
      inject(Store).selectSignal(view, options),
    observable: () => inject(Store).select(view),
  });
}

/** Memoized views for each state field, plus the complete state. */
type StateViews<State> = {
  [Key in keyof State]-?: MemoizedSelector<object, State[Key]> & ViewMethods<State[Key]>;
} & {
  /**
   * Selects the entire state object.
   *
   * Prefer a specific view when only part of the state is needed.
   * The result changes whenever the state reference changes.
   */
  root: MemoizedSelector<object, State> & ViewMethods<State>;
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
  /**
   * Builds additional named views from the generated views.
   * The view builder is createSelector: its inputs are views, and its
   * calculation receives their actual values with inferred types.
   * Results are memoized until an input changes.
   *
   * The callback runs once during state definition and returns an object
   * mapping names to views. Names cannot overwrite generated views.
   * A local derived view can be used as an input to another derived view.
   * Returned views are exposed on the state's views object; local views
   * that are not returned remain internal to the callback.
   *
   * @example Deriving a view from a state field
   * ```ts
   * extraViews: ({ count }, view) => ({
   *   doubled: view(count, value => value * 2),
   * })
   * ```
   *
   * @example Deriving one extra view from another
   * ```ts
   * extraViews: ({ books, search }, view) => {
   *   const searchResults = view(books, search, (books, search) =>
   *     search.ids
   *       .map(id => books.entities[id])
   *       .filter(book => book !== undefined)
   *   );
   *   const resultCount = view(searchResults, results => results.length);
   *
   *   return { searchResults, resultCount };
   * }
   * ```
   */
  extraViews?: (
    views: StateViews<NoInfer<State>>,
    view: typeof createSelector,
  ) => ExtraViews;
  /**
   * Effects belonging to this state, registered when provide() is called.
   * Accepts a functional effect, an effect class, a named effect object,
   * or an array mixing these forms. Nested and readonly arrays are supported.
   * Functional effects must be created with functionalEffect() or NgRx's
   * createEffect() with { functional: true }.
   *
   * @example A single effect class
   * ```ts
   * effects: BooksEffects
   * ```
   *
   * @example A named effect object
   * ```ts
   * effects: { loadBooks: loadBooksEffect }
   * ```
   *
   * @example A single functional effect
   * ```ts
   * effects: loadBooksEffect
   * ```
   *
   * @example Mixed forms and nested arrays
   * ```ts
   * effects: [
   *   loadBooksEffect,
   *   { saveBooks: saveBooksEffect },
   *   [addBookEffect, removeBookEffect],
   *   BooksEffects,
   * ]
   * ```
   */
  effects?: EffectInput;
}) {
  const handlers =
    typeof config.stateHandlers === "function"
      ? config.stateHandlers(on as StateOn<State>)
      : config.stateHandlers;
  const reducer: (state: State | undefined, event: Event) => State =
    createReducer(config.initialState, ...handlers);
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
        attachViewMethods(createSelector(selectState, (state) => state[name as keyof State])),
      ]),
    ),
    root: attachViewMethods(selectState),
  } as StateViews<State>;
  const extras: Record<string, MemoizedSelector<object, any>> =
    config.extraViews?.(defaults, createSelector) ?? {};
  for (const name of Object.keys(extras)) {
    if (Object.hasOwn(defaults, name)) {
      throw new Error(`Extra view "${name}" conflicts with a default view.`);
    }
  }
  const views = {
    ...defaults,
    ...Object.fromEntries(
      Object.entries(extras).map(([name, view]) => [name, attachViewMethods(view)]),
    ),
  } as StateViews<State> & InjectableViews<ExtraViews>;
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
