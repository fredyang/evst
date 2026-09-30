import {
  createFeatureSelector,
  createReducer,
  on,
  type ActionCreator,
  type ActionReducer,
  type MemoizedSelector,
  type ReducerTypes,
} from "@ngrx/store";
import {
  provideFeature,
  type TasksRegistrationInput,
} from "./provide-feature.js";
import type { Action } from "@ngrx/store";
import { attachViewMethods, type ViewMethods, view } from "./view.js";

/** Adds signal and observable access to each named memoized view. */
type InjectableViews<
  Views extends Record<string, MemoizedSelector<object, any>>,
> = {
  [Key in keyof Views]: Views[Key] & ViewMethods<ReturnType<Views[Key]>>;
};

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
  /**
   * Pure NgRx reducer for unit tests and direct Store integration. Events are
   * neither published nor handled by tasks when this function is called.
   */
  readonly reducer: ActionReducer<State, Action>;
  /**
   * Registers this feature reducer and its tasks in an application or route injector.
   * A root Store is required, normally from `provideStoreSugar()`.
   *
   * @returns Environment providers for the feature reducer and its tasks.
   */
  provide(): ReturnType<typeof provideFeature>;
  /**
   * Adds immutable event handlers while preserving each event payload type.
   *
   * @param args - Event creators followed by a reducer handler.
   * @returns A new definition containing the added handler.
   */
  on<Creators extends readonly ActionCreator[]>(
    ...args: [...Creators, ReducerTypes<State, Creators>["reducer"]]
  ): StateDefinition<State, ExtraViews>;
  /**
   * Optionally adds named, derived views alongside the default field and `root`
   * views. The callback runs once; use the exported `view()` builder for each
   * derived view. Existing names, including `root`, cannot be overwritten.
   *
   * @param build - Creates named derived views from the current views.
   * @returns A new definition containing the added views.
   */
  withViews<Added extends Record<string, MemoizedSelector<object, any>>>(
    build: (views: StateViews<State> & InjectableViews<ExtraViews>) => Added,
  ): StateDefinition<State, ExtraViews & Added>;
  /**
   * Optionally appends tasks so this definition's `provide()` method registers
   * both the feature state and its tasks. Task collections, functional effects,
   * named records, and nested arrays are supported.
   *
   * @param tasks - Tasks to register with this feature.
   * @returns A new definition containing the added tasks.
   */
  withTasks(tasks: TasksRegistrationInput): StateDefinition<State, ExtraViews>;
}

/**
 * Defines feature state with typed handlers, memoized views, and optional tasks.
 *
 * `.on()`, `.withViews()`, and `.withTasks()` return new definitions without
 * changing earlier steps. Every step exposes `views`, `reducer`, and `provide()`;
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
 * @returns A chainable definition with generated views and a pure reducer.
 * @throws If initialState contains an own property named `root`.
 *
 * @example Defining handlers and derived views
 * ```ts
 * import { props } from '@ngrx/store';
 * import { events, state, view } from '@ngrx-eventify/store';
 *
 * const CounterEvents = events('Counter', {
 *   added: props<{ amount: number }>(),
 * });
 *
 * export const counter = state('counter', { count: 0 })
 *   .on(CounterEvents.added, (current, { amount }) => ({
 *     count: current.count + amount,
 *   }))
 *   .withViews(({ count }) => ({
 *     doubled: view(count, count => count * 2),
 *   }));
 *
 * // Component field initializers:
 * // readonly count = counter.views.count.signal();
 * // readonly doubled$ = counter.views.doubled.observable();
 *
 * // Pure transition, without publishing or running tasks:
 * counter.reducer(undefined, CounterEvents.added({ amount: 3 }));
 * // { count: 3 }
 * ```
 *
 * @example Adding tasks and registering state
 * ```ts
 * import { state, provideStoreSugar } from '@ngrx-eventify/store';
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
        attachViewMethods(view(root, (state) => state[key as keyof State])),
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
  tasks: readonly TasksRegistrationInput[],
  views: StateViews<State> & InjectableViews<ExtraViews>,
): StateDefinition<State, ExtraViews> {
  const reducer = createReducer(initialState, ...handlers);
  return {
    views,
    reducer,
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
      const added = build(views);
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
