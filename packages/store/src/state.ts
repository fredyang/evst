import type { Signal } from "@angular/core";
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
import { provideFeature, type TaskInput } from "./provide-feature.js";
import type { Action } from "@ngrx/store";
import { cachedStore } from "./provide-store-sugar.js";

/** Injection helpers attached to each exposed view. */
type ViewMethods<Result> = {
  /** Reads this view as a signal from the registered Sugar Store. */
  signal(options?: SelectSignalOptions<Result>): Signal<Result>;
  /** Reads this view as an observable from the registered Sugar Store. */
  observable(): Observable<Result>;
};

/** Adds signal and observable access to each named memoized view. */
type InjectableViews<
  Views extends Record<string, MemoizedSelector<object, any>>,
> = {
  [Key in keyof Views]: Views[Key] & ViewMethods<ReturnType<Views[Key]>>;
};

function attachViewMethods<View extends MemoizedSelector<object, any>>(
  view: View,
) {
  return Object.assign(view, {
    signal: (options?: SelectSignalOptions<ReturnType<View>>) =>
      cachedStore().selectSignal(view, options),
    observable: () => cachedStore().select(view),
  });
}

/** Memoized views for each state field, plus the complete state. */
type StateViews<State> = {
  [Key in keyof State]-?: MemoizedSelector<object, State[Key]> &
    ViewMethods<State[Key]>;
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

/** An immutable state definition with composable handlers, views, and tasks. */
export interface StateDefinition<
  State extends object,
  ExtraViews extends Record<string, MemoizedSelector<object, any>> = {},
> {
  /** Generated and derived views; root selects the complete feature state. */
  readonly views: StateViews<State> & InjectableViews<ExtraViews>;
  /** Pure state transitions for tests; no events are published or tasks run. */
  readonly test: {
    getNextState(state: State | undefined, event: Action): State;
  };
  /** Registers this definition; requires a root Store, normally from provideStoreSugar(). */
  provide(): ReturnType<typeof provideFeature>;
  /** Adds a handler, preserving inference for each event's payload. */
  on<Creators extends readonly ActionCreator[]>(
    ...args: [...Creators, ReducerTypes<State, Creators>["reducer"]]
  ): StateDefinition<State, ExtraViews>;
  /**
   * Adds named memoized views from generated or previously added views.
   * The callback runs once; its view builder is NgRx's createSelector.
   * Existing names, including root, cannot be overwritten.
   */
  withViews<Added extends Record<string, MemoizedSelector<object, any>>>(
    build: (
      views: StateViews<State> & InjectableViews<ExtraViews>,
      view: typeof createSelector,
    ) => Added,
  ): StateDefinition<State, ExtraViews & Added>;
  /** Appends task classes, functional tasks, named records, or nested arrays. */
  withTasks(tasks: TaskInput): StateDefinition<State, ExtraViews>;
}

/**
 * Defines feature state with typed handlers, memoized views, and optional tasks.
 *
 * `.on()`, `.withViews()`, and `.withTasks()` return new definitions without
 * changing earlier steps. Every step exposes `views`, `provide()`, and `test`;
 * no final `.build()` call is required. Registration uses the final definition.
 * Handlers must return state immutably.
 *
 * Each own enumerable initial-state field receives a view with the same name.
 * `views.root` selects the complete feature state. Extra views can compose
 * generated or previously added views, but cannot overwrite existing names.
 * Views remain callable NgRx selectors. Their `.signal()` and `.observable()`
 * methods use the Store registered through `provideStoreSugar()`.
 *
 * `.provide()` registers the feature and its tasks in an application or route
 * injector. `provideStoreSugar()` normally supplies the required root Store.
 * Defining state alone does not register it or execute tasks.
 *
 * @param name - Key under which the feature is registered in the root store.
 * @param initialState - Initial feature values, also used to infer handler and
 * view types. Fields should be initialized explicitly; `root` is reserved.
 * @returns A chainable definition with generated views and pure test helpers.
 * @throws If initialState contains an own property named `root`.
 *
 * @example Defining handlers and derived views
 * ```ts
 * import { props } from '@ngrx/store';
 * import { events, state } from '@ngrx-sugar/store';
 *
 * const CounterEvents = events('Counter', {
 *   added: props<{ amount: number }>(),
 * });
 *
 * export const counter = state('counter', { count: 0 })
 *   .on(CounterEvents.added, (current, { amount }) => ({
 *     count: current.count + amount,
 *   }))
 *   .withViews(({ count }, view) => ({
 *     doubled: view(count, count => count * 2),
 *   }));
 *
 * // Component field initializers:
 * // readonly count = counter.views.count.signal();
 * // readonly doubled$ = counter.views.doubled.observable();
 *
 * // Pure transition, without publishing or running tasks:
 * counter.test.getNextState(undefined, CounterEvents.added({ amount: 3 }));
 * // { count: 3 }
 * ```
 *
 * @example Adding tasks and registering state
 * ```ts
 * import { state, provideStoreSugar } from '@ngrx-sugar/store';
 * import { BooksEvents } from './books.events';
 * import { booksTasks } from './books.tasks';
 * import { initialBooksState } from './books.initial-state';
 *
 * const books = state('books', initialBooksState)
 *   .on(BooksEvents.loaded, (current, { books }) => ({ ...current, books }))
 *   .withTasks(booksTasks);
 *
 * const appConfig = {
 *   providers: [provideStoreSugar(), books.provide()],
 * };
 * ```
 */
export function state<State extends object>(
  name: string,
  initialState: State,
): StateDefinition<State> {
  if (Object.hasOwn(initialState, "root")) {
    throw new Error(
      'Feature state cannot contain the reserved view name "root".',
    );
  }
  const root = createFeatureSelector<State>(name);
  const views = {
    ...Object.fromEntries(
      Object.keys(initialState).map((key) => [
        key,
        attachViewMethods(
          createSelector(root, (state) => state[key as keyof State]),
        ),
      ]),
    ),
    root: attachViewMethods(root),
  } as StateViews<State>;
  return chainState(name, initialState, [], [], views);
}

function chainState<
  State extends object,
  ExtraViews extends Record<string, MemoizedSelector<object, any>>,
>(
  name: string,
  initialState: State,
  handlers: readonly ReducerTypes<State, any>[],
  tasks: readonly TaskInput[],
  views: StateViews<State> & InjectableViews<ExtraViews>,
): StateDefinition<State, ExtraViews> {
  const reducer = createReducer(initialState, ...handlers);
  return {
    views,
    test: { getNextState: reducer },
    provide: () => provideFeature({ name, reducer }, ...tasks),
    on: (...args) =>
      chainState(
        name,
        initialState,
        [...handlers, (on as StateOn<State>)(...args)],
        tasks,
        views,
      ),
    withViews: (build) => {
      const added = build(views, createSelector);
      for (const key of Object.keys(added)) {
        if (Object.hasOwn(views, key)) {
          throw new Error(
            `Extra view "${key}" conflicts with an existing view.`,
          );
        }
      }
      const combined = {
        ...views,
        ...Object.fromEntries(
          Object.entries(added).map(([key, view]) => [
            key,
            attachViewMethods(view),
          ]),
        ),
      } as StateViews<State> & InjectableViews<ExtraViews & typeof added>;
      return chainState(name, initialState, handlers, tasks, combined);
    },
    withTasks: (added) =>
      chainState(name, initialState, handlers, [...tasks, added], views),
  };
}
