import { definitionKind } from "./definition-kind.js";
import { assertNewNames, assertUniqueEvents } from "./definition-validation.js";
import {
  createReducer,
  type ActionCreatorWithPayload,
  type ActionCreatorWithoutPayload,
  type CaseReducer,
  type Reducer,
} from "@reduxjs/toolkit";
import { view, type View } from "./view.js";

import { task, type NamedTasks, type TaskBuilder } from "./tasks.js";

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

/**
 * Immutable feature definition. Each composition call returns a new definition.
 * Tasks retain the views available when their callback ran. Registration activates
 * the final definition; it does not mutate earlier definitions.
 */
export type EvstDefinition<
  Name extends string,
  State extends object,
  ExtraViews extends ExtraViewRecord<Record<Name, State>> = {},
  Effects extends NamedTasks | undefined = undefined,
> = EvstBuilder<Name, State, ExtraViews, Effects> &
  (Effects extends NamedTasks ? { readonly effects: Readonly<Effects> } : {});

/** Composition methods shared by definitions with and without tasks. */
export interface EvstBuilder<
  Name extends string,
  State extends object,
  ExtraViews extends ExtraViewRecord<Record<Name, State>> = {},
  Effects extends NamedTasks | undefined = undefined,
> {
  readonly [definitionKind]: "feature";
  readonly name: Name;
  readonly reducer: Reducer<State>;
  /** Generated field views, root, and all derived views declared so far. */
  readonly views: BaseViews<Name, State> & ExtraViews;
  /** Adds named handlers. Duplicate labels or event types throw. */
  state(
    build: (on: StateOn<State>) => NamedStateHandlers<State>,
  ): EvstDefinition<Name, State, ExtraViews, Effects>;
  /** Adds derived views. Existing field, root, and derived names cannot be overwritten. */
  view<Added extends ExtraViewRecord<Record<Name, State>>>(
    build: (views: BaseViews<Name, State> & ExtraViews) => Added,
  ): EvstDefinition<Name, State, ExtraViews & Added, Effects>;
  /** Adds named tasks using all currently declared views. Duplicate labels throw. */
  task<Added extends NamedTasks>(
    build: (
      on: TaskBuilder,
      views: BaseViews<Name, State> & ExtraViews,
    ) => Added,
  ): EvstDefinition<
    Name,
    State,
    ExtraViews,
    Effects extends NamedTasks ? Effects & Added : Added
  >;
}

/** Creates a feature with a reducer and automatic field and root views. */
export function evst<const Name extends string, State extends object>(
  name: Name,
  initialState: State,
): EvstDefinition<Name, State> {
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
  return chain(name, initialState, {}, views, undefined);
}

function chain<
  Name extends string,
  State extends object,
  ExtraViews extends ExtraViewRecord<Record<Name, State>>,
  Effects extends NamedTasks | undefined,
>(
  name: Name,
  initialState: State,
  handlers: NamedStateHandlers<State>,
  views: BaseViews<Name, State> & ExtraViews,
  effects: Effects,
  reducer = createReducer(initialState, (builder) => {
    for (const { event, reducer } of Object.values(handlers))
      builder.addCase(event as any, (draft, action: any) =>
        reducer(draft, action.payload),
      );
  }),
): EvstDefinition<Name, State, ExtraViews, Effects> {
  const definition: EvstBuilder<Name, State, ExtraViews, Effects> = {
    [definitionKind]: "feature",
    name,
    reducer,
    views,
    state: (build) => {
      const on: StateOn<State> = (event, reducer) => ({ event, reducer });
      const added = build(on);
      assertNewNames(handlers, added, "State handler");
      const combined = { ...handlers, ...added };
      assertUniqueEvents(
        Object.values(combined).map(({ event }) => event.type),
      );
      return chain(name, initialState, combined, views, effects);
    },
    view: (build) => {
      const added = build(views);
      assertNewNames(views, added, "View");
      return chain<Name, State, ExtraViews & typeof added, Effects>(
        name,
        initialState,
        handlers,
        { ...views, ...added },
        effects,
        reducer,
      );
    },
    task: <Added extends NamedTasks>(
      build: (
        on: TaskBuilder,
        views: BaseViews<Name, State> & ExtraViews,
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
  ) as EvstDefinition<Name, State, ExtraViews, Effects>;
}
