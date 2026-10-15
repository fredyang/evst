import {
  createReducer,
  type ActionCreatorWithPayload,
  type ActionCreatorWithoutPayload,
  type CaseReducer,
  type Reducer,
} from "@reduxjs/toolkit";
import { view, type View } from "./view.js";

import {
  taskOn,
  type NamedTasks,
  type TaskBuilder,
  type Tasks,
} from "./tasks.js";

type EventCreator = ActionCreatorWithPayload<any> | ActionCreatorWithoutPayload;
type EventCaseReducer<State, Creator extends EventCreator> =
  CaseReducer<State, ReturnType<Creator>> extends (
    state: infer DraftState,
    action: any,
  ) => infer Result
    ? (state: DraftState, payload: ReturnType<Creator>["payload"]) => Result
    : never;
type StateOn<State> = <Creator extends EventCreator>(
  event: Creator,
  reducer: EventCaseReducer<State, Creator>,
) => { event: Creator; reducer: EventCaseReducer<State, Creator> };
/** Associates a subscribed event with a pure state transition using Immer. */
export type StateHandler<State> = ReturnType<StateOn<State>>;
/** State handlers keyed by descriptive transition names. */
export type NamedStateHandlers<State> = Record<string, StateHandler<State>>;
type BaseViews<Name extends string, State extends object> = {
  [Key in keyof State]: View<Record<Name, State>, State[Key]>;
} & {
  root: View<Record<Name, State>, State>;
};
type ExtraViewRecord<Root> = Record<string, View<Root, any>>;

/** A terminal state-and-Tasks bundle registered through the bundles option. */
export interface FeatureBundle<
  Name extends string,
  State extends object,
  ExtraViews extends ExtraViewRecord<Record<Name, State>> = {},
  Effects extends NamedTasks = NamedTasks,
> extends Tasks<Effects> {
  readonly name: Name;
  readonly reducer: Reducer<State>;
  readonly views: BaseViews<Name, State> & ExtraViews;
}

export interface FeatureStateDefinition<
  Name extends string,
  State extends object,
  ExtraViews extends ExtraViewRecord<Record<Name, State>> = {},
> {
  readonly name: Name;
  readonly reducer: Reducer<State>;
  readonly views: BaseViews<Name, State> & ExtraViews;
  /**
   * Declares event subscriptions through named state handlers.
   * Returns a new definition retaining stateOn(), extraViews(), and taskOn().
   * Registered through `createEvstStore()` or `evst.provide()`.
   * Handler names label transitions; events passed to `on` select their inputs.
   */
  stateOn(
    build: (on: StateOn<State>) => NamedStateHandlers<State>,
  ): FeatureStateDefinition<Name, State, ExtraViews>;
  /**
   * Finishes state composition with named Tasks and inferred current Views.
   * @returns A bundle exposing name, views, reducer, effects, and register().
   * Register through createEvstStore({ bundles: [bundle] }) or evst.provide().
   * The original definition remains unchanged; the bundle has no composition methods.
   */
  taskOn<Effects extends NamedTasks>(
    build: (
      on: TaskBuilder,
      views: BaseViews<Name, State> & ExtraViews,
    ) => Effects,
  ): FeatureBundle<Name, State, ExtraViews, Effects>;
  extraViews<Added extends ExtraViewRecord<Record<Name, State>>>(
    build: (views: BaseViews<Name, State> & ExtraViews) => Added,
  ): FeatureStateDefinition<Name, State, ExtraViews & Added>;
}

/** Defines a Redux Toolkit feature reducer and generated field views. */
export function state<const Name extends string, State extends object>(
  name: Name,
  initialState: State,
): FeatureStateDefinition<Name, State> {
  if (Object.hasOwn(initialState, "root"))
    throw new Error(
      'Feature state cannot contain the reserved view name "root".',
    );
  const root = view((rootState: Record<Name, State>) => rootState[name]);
  const views = Object.assign(
    Object.fromEntries(
      Object.keys(initialState).map((key) => [
        key,
        view(root, (slice) => slice[key as keyof State]),
      ]),
    ),
    { root },
  ) as BaseViews<Name, State>;
  return chain(name, initialState, [], views);
}

function chain<
  Name extends string,
  State extends object,
  ExtraViews extends ExtraViewRecord<Record<Name, State>>,
>(
  name: Name,
  initialState: State,
  handlers: readonly StateHandler<State>[],
  views: BaseViews<Name, State> & ExtraViews,
): FeatureStateDefinition<Name, State, ExtraViews> {
  const reducer = createReducer(initialState, (builder) => {
    for (const { event, reducer } of handlers)
      builder.addCase(event as any, (draft, action: any) =>
        reducer(draft, action.payload),
      );
  });
  return {
    name,
    reducer,
    views,
    taskOn: (build) => {
      const tasks = taskOn((on) => build(on, views));
      return {
        name,
        reducer,
        views,
        effects: tasks.effects,
        register: tasks.register,
      };
    },
    stateOn: (build: (on: StateOn<State>) => NamedStateHandlers<State>) => {
      const on: StateOn<State> = (event, reducer) => ({ event, reducer });
      return chain(
        name,
        initialState,
        [...handlers, ...Object.values(build(on))],
        views,
      );
    },
    extraViews: <Added extends ExtraViewRecord<Record<Name, State>>>(
      build: (views: BaseViews<Name, State> & ExtraViews) => Added,
    ) => {
      const added = build(views);
      for (const key of Object.keys(added))
        if (Object.hasOwn(views, key))
          throw new Error(
            `Extra view \"${key}\" conflicts with an existing view.`,
          );
      return chain<Name, State, ExtraViews & Added>(
        name,
        initialState,
        handlers,
        { ...views, ...added } as BaseViews<Name, State> & ExtraViews & Added,
      );
    },
  };
}
