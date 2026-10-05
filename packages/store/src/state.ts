import {
  createFeatureSelector,
  createReducer,
  on,
  type ActionCreator,
  type ActionReducer,
  type MemoizedSelector,
  type ReducerTypes,
} from "@ngrx/store";
import { provideFeature } from "./provide-feature.js";
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
type StateHandler<State extends object> = ReducerTypes<State, any>;

/** An immutable state definition with composable handlers and views. */
export interface FeatureStateDefinition<
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
   * Registers this feature reducer in an application or route injector.
   * A root Store is required, normally from `provideEvst()`.
   *
   * @returns Environment providers for the feature reducer.
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
  ): FeatureStateDefinition<State, ExtraViews>;
  /**
   * Adds named state handlers. Definition keys are descriptive labels for each
   * transition; they do not name events or affect reducer behavior. The event
   * creators passed to `on` determine which events each handler receives.
   *
   * @param build - Creates named handlers with the supplied event `on` builder.
   * @returns A new definition containing the added handlers.
   */
  handle<Definitions extends Record<string, StateHandler<State>>>(
    build: (on: StateOn<State>) => Definitions,
  ): FeatureStateDefinition<State, ExtraViews>;
  /**
   * Optionally adds named, derived views alongside the default field and `root`
   * views. The callback runs once; use the exported `view()` builder for each
   * derived view. Existing names, including `root`, cannot be overwritten.
   *
   * @param build - Creates named derived views from the current views.
   * @returns A new definition containing the added views.
   */
  extraViews<Added extends Record<string, MemoizedSelector<object, any>>>(
    build: (views: StateViews<State> & InjectableViews<ExtraViews>) => Added,
  ): FeatureStateDefinition<State, ExtraViews & Added>;
}

/**
 * Defines feature state with typed handlers and memoized views.
 *
 * `.handle()` and `.extraViews()` return new definitions without
 * changing earlier steps. Every step exposes `views`, `reducer`, and `provide()`;
 * no final `.build()` call is required. Registration uses the final definition.
 * Handlers must return state immutably.
 *
 * Each own enumerable initial-state field receives a view with the same name.
 * `views.root` selects the complete feature state. Extra views can compose
 * generated or previously added views, but cannot overwrite existing names.
 * Views remain callable NgRx selectors. Their `.signal()` and `.observable()`
 * methods use the Store registered through `provideEvst()`.
 *
 * @example Generated and composed feature views
 * ```ts
 * import type { EntityState } from '@ngrx/entity';
 * import { state, view } from '@evst/store';
 *
 * interface Book {
 *   id: string;
 *   title: string;
 * }
 *
 * interface EntityBooksState extends EntityState<Book> {
 *   selectedBookId: string | null;
 * }
 *
 * interface BooksState {
 *   books: EntityBooksState;
 *   search: { ids: string[]; loading: boolean; error: string; query: string };
 *   collection: { loaded: boolean; loading: boolean; ids: string[] };
 * }
 *
 * const initialState: BooksState = {
 *   books: { ids: [], entities: {}, selectedBookId: null },
 *   search: { ids: [], loading: false, error: '', query: '' },
 *   collection: { loaded: false, loading: false, ids: [] },
 * };
 *
 * const booksState = state('books', initialState).extraViews(
 *   ({ books, search, collection }) => ({
 *     selectedBook: view(books, books =>
 *       books.selectedBookId ? books.entities[books.selectedBookId] : undefined,
 *     ),
 *     searchBookIds: view(search, search => search.ids),
 *     collectionBookIds: view(collection, collection => collection.ids),
 *   }),
 * );
 *
 * // Generated views: booksState.views.root, booksState.views.books,
 * // booksState.views.search, and booksState.views.collection.
 * // Composed views: booksState.views.selectedBook,
 * // booksState.views.searchBookIds, and booksState.views.collectionBookIds.
 * ```
 *
 * `.provide()` registers the feature in an application or route
 * injector. `provideEvst()` normally supplies the required root Store.
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
 * import { events, state, view } from '@evst/store';
 *
 * const fromCounter = events('Counter', {
 *   added: props<{ amount: number }>(),
 * });
 *
 * export const counter = state('counter', { count: 0 }).handle(on => ({
 *   addAmount: on(fromCounter.added, (current, { amount }) => ({
 *     count: current.count + amount,
 *   })),
 * }))
 *   .extraViews(({ count }) => ({
 *     doubled: view(count, count => count * 2),
 *   }));
 *
 * // Component field initializers:
 * // readonly count = counter.views.count.signal();
 * // readonly doubled$ = counter.views.doubled.observable();
 *
 * // Pure transition, without publishing or running tasks:
 * counter.reducer(undefined, fromCounter.added({ amount: 3 }));
 * // { count: 3 }
 * ```
 *
 * @example Registering state and tasks
 * ```ts
 * import { state, provideEvst } from '@evst/store';
 * import { fromBooksApi } from './books.events';
 * import { booksTasks } from './books.tasks';
 * import { initialBooksState } from './books.initial-state';
 *
 * const books = state('books', initialBooksState).handle(on => ({
 *   storeLoadedBooks: on(fromBooksApi.loaded, (current, { books }) => ({
 *     ...current,
 *     books,
 *   })),
 * }));
 *
 * const appConfig = {
 *   providers: [provideEvst(), books.provide(), booksTasks.provide()],
 * };
 * ```
 */
export function state<State extends object>(
  name: string,
  initialState: State,
): FeatureStateDefinition<State> {
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
  return chainState(name, initialState, [], views);
}

function chainState<
  State extends object,
  ExtraViews extends Record<string, MemoizedSelector<object, any>>,
>(
  name: string,
  initialState: State,
  handlers: readonly ReducerTypes<State, any>[],
  views: StateViews<State> & InjectableViews<ExtraViews>,
): FeatureStateDefinition<State, ExtraViews> {
  const reducer = createReducer(initialState, ...handlers);
  return {
    views,
    reducer,
    provide: () => provideFeature({ name, reducer }),
    on: (...args) =>
      chainState(
        name,
        initialState,
        [...handlers, (on as StateOn<State>)(...args)],
        views,
      ),
    handle: (build) =>
      chainState(
        name,
        initialState,
        [...handlers, ...Object.values(build(on as StateOn<State>))],
        views,
      ),
    extraViews: (build) => {
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
      return chainState(name, initialState, handlers, combined);
    },
  };
}
