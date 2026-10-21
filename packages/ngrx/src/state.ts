import { assertNewNames, assertUniqueEvents } from "./definition-validation.js";
import type { EnvironmentProviders } from "@angular/core";
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

import { bundle } from "./bundle.js";
import { task, type NamedTasks, type TaskBuilder } from "./tasks.js";

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
/** Associates subscribed events with a pure state transition. */
export type StateHandler<State extends object> = ReducerTypes<State, any>;
/** State handlers keyed by descriptive transition names. */
export type NamedStateHandlers<State extends object> = Record<
  string,
  StateHandler<State>
>;

/**
 * Immutable feature definition. Each composition call returns a new definition.
 * Tasks retain the views available when their callback ran. Registration activates
 * the final definition; it does not mutate earlier definitions.
 */
export type EvstDefinition<
  State extends object,
  ExtraViews extends Record<string, MemoizedSelector<object, any>> = {},
  Effects extends NamedTasks | undefined = undefined,
> = EvstBuilder<State, ExtraViews, Effects> &
  (Effects extends NamedTasks ? { readonly effects: Readonly<Effects> } : {});

/** Composition methods shared by definitions with and without tasks. */
export interface EvstBuilder<
  State extends object,
  ExtraViews extends Record<string, MemoizedSelector<object, any>> = {},
  Effects extends NamedTasks | undefined = undefined,
> {
  readonly name: string;
  readonly reducer: ActionReducer<State, Action>;
  /**
   * Read-only data projections for fields, root state, and derived values.
   * Views are independent of UI rendering and can be consumed by Tasks or components.
   */
  readonly views: StateViews<State> & InjectableViews<ExtraViews>;
  /** Registers the reducer and all accumulated tasks using NgRx providers. */
  provide(): EnvironmentProviders;
  /** Adds named handlers. Duplicate labels or event types throw. */
  state(
    build: (on: StateOn<State>) => NamedStateHandlers<State>,
  ): EvstDefinition<State, ExtraViews, Effects>;
  /**
   * Adds derived, read-only data projections, independent of UI rendering.
   * The builtInViews parameter includes generated field and root Views plus all
   * previously declared derived Views. Property access exposes available Views
   * through editor completion. Existing names cannot be overwritten.
   */
  view<Added extends Record<string, MemoizedSelector<object, any>>>(
    build: (
      builtInViews: StateViews<State> & InjectableViews<ExtraViews>,
    ) => Added,
  ): EvstDefinition<State, ExtraViews & Added, Effects>;
  /** Adds named tasks using all currently declared views. Duplicate labels throw. */
  task<Added extends NamedTasks>(
    build: (
      on: TaskBuilder,
      views: StateViews<State> & InjectableViews<ExtraViews>,
    ) => Added,
  ): EvstDefinition<
    State,
    ExtraViews,
    Effects extends NamedTasks ? Effects & Added : Added
  >;
}

/** Creates an Angular feature with a reducer and automatic field and root views. */
export function evst<State extends object>(
  name: string,
  initialState: State,
): EvstDefinition<State> {
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
        view(root, (state) => state[key as keyof State]),
      ]),
    ),
    root: attachViewMethods(root),
  } as StateViews<State>;
  return chain(name, initialState, {}, views, undefined);
}

function chain<
  State extends object,
  ExtraViews extends Record<string, MemoizedSelector<object, any>>,
  Effects extends NamedTasks | undefined,
>(
  name: string,
  initialState: State,
  handlers: NamedStateHandlers<State>,
  views: StateViews<State> & InjectableViews<ExtraViews>,
  effects: Effects,
  reducer = createReducer(initialState, ...Object.values(handlers)),
): EvstDefinition<State, ExtraViews, Effects> {
  const definition: EvstBuilder<State, ExtraViews, Effects> = {
    name,
    views,
    reducer,
    provide: () =>
      effects === undefined
        ? provideFeature({ name, reducer })
        : bundle(
            { provide: () => provideFeature({ name, reducer }) },
            task(() => effects),
          ).provide(),
    state: (build) => {
      const added = build(on as StateOn<State>);
      assertNewNames(handlers, added, "State handler");
      const combined = { ...handlers, ...added };
      assertUniqueEvents(Object.values(combined).flatMap(({ types }) => types));
      return chain(name, initialState, combined, views, effects);
    },
    view: (build) => {
      const added = build(views);
      assertNewNames(views, added, "View");
      const combined = {
        ...views,
        ...Object.fromEntries(
          Object.entries(added).map(([key, selector]) => [
            key,
            attachViewMethods(selector),
          ]),
        ),
      } as StateViews<State> & InjectableViews<ExtraViews & typeof added>;
      return chain<State, ExtraViews & typeof added, Effects>(
        name,
        initialState,
        handlers,
        combined,
        effects,
        reducer,
      );
    },
    task: <Added extends NamedTasks>(
      build: (
        on: TaskBuilder,
        views: StateViews<State> & InjectableViews<ExtraViews>,
      ) => Added,
    ) => {
      const added = task((on) => build(on, views));
      assertNewNames(effects ?? {}, added.effects, "Task");
      const combined = {
        ...effects,
        ...added.effects,
      } as Effects extends NamedTasks ? Effects & Added : Added;
      return chain(name, initialState, handlers, views, combined, reducer);
    },
  };
  return Object.assign(
    definition,
    effects === undefined ? {} : { effects },
  ) as EvstDefinition<State, ExtraViews, Effects>;
}
