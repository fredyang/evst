import {
  createReducer,
  type ActionCreatorWithPayload,
  type ActionCreatorWithoutPayload,
  type CaseReducer,
  type Reducer,
} from "@reduxjs/toolkit";
import { view, type View } from "./view.js";

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
type Handler<State> = ReturnType<StateOn<State>>;

export interface FeatureStateDefinition<
  Name extends string,
  State extends object,
> {
  readonly name: Name;
  readonly reducer: Reducer<State>;
  readonly views: {
    [Key in keyof State]: View<Record<Name, State>, State[Key]>;
  } & {
    root: View<Record<Name, State>, State>;
  } & Record<string, View<Record<Name, State>, any>>;
  handle(build: (on: StateOn<State>) => Record<string, Handler<State>>): this;
  extraViews<Added extends Record<string, View<Record<Name, State>, unknown>>>(
    build: (views: FeatureStateDefinition<Name, State>["views"]) => Added,
  ): this;
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
  ) as FeatureStateDefinition<Name, State>["views"];
  return chain(name, initialState, [], views);
}

function chain<
  Name extends string,
  State extends object,
  Views extends Record<string, View<Record<Name, State>, unknown>>,
>(
  name: Name,
  initialState: State,
  handlers: readonly Handler<State>[],
  views: Views,
): any {
  return {
    name,
    reducer: createReducer(initialState, (builder) => {
      for (const { event, reducer } of handlers)
        builder.addCase(event as any, (draft, action: any) =>
          reducer(draft, action.payload),
        );
    }),
    views,
    handle: (build: (on: StateOn<State>) => Record<string, Handler<State>>) => {
      const on: StateOn<State> = (event, reducer) => ({ event, reducer });
      return chain(
        name,
        initialState,
        [...handlers, ...Object.values(build(on))],
        views,
      );
    },
    extraViews: (
      build: (
        views: Views,
      ) => Record<string, View<Record<Name, State>, unknown>>,
    ) => {
      const added = build(views);
      for (const key of Object.keys(added))
        if (Object.hasOwn(views, key))
          throw new Error(
            `Extra view \"${key}\" conflicts with an existing view.`,
          );
      return chain(name, initialState, handlers, { ...views, ...added });
    },
  };
}
