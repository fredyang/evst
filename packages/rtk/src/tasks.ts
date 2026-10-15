import type {
  EnhancedStore,
  ListenerMiddlewareInstance,
} from "@reduxjs/toolkit";
import type { View } from "./view.js";

type EventCreator = ((...args: any[]) => { type: string; payload: any }) & {
  type: string;
};
type Outcome = { type: string } | void;

export type TaskEffect<Payload = void> = (
  payload: Payload,
) => Outcome | Promise<Outcome>;

/** Starts an external subscription and optionally returns its cleanup function. */
export type TaskSource = (
  emit: (outcome: Exclude<Outcome, void>) => void,
) => void | (() => void);
type TaskStore = Pick<EnhancedStore, "dispatch">;

/** Side effect activated when its task collection is registered. */
export type Task = {
  register(listener: ListenerMiddlewareInstance, store?: TaskStore): () => void;
};
/** Tasks keyed by descriptive names. */
export type NamedTasks = Record<string, Task>;
export interface Tasks {
  register(listener: ListenerMiddlewareInstance, store?: TaskStore): () => void;
}
type ViewSelector = (state: any) => unknown;
type ViewValues<Views extends readonly ViewSelector[]> = {
  [Index in keyof Views]: ReturnType<Views[Index]>;
};

/** Creates event-triggered, View-triggered, or external-source Tasks. */
export interface TaskBuilder {
  /** Starts an external source on registration; emitted outcomes are dispatched until stopped. */
  (source: TaskSource): Task;
  /** Runs once when any selected View changes, without an initial emission. */
  <Views extends [View<any, any>, ...View<any, any>[]]>(
    ...args: [
      ...Views,
      effect: (...values: ViewValues<Views>) => Outcome | Promise<Outcome>,
    ]
  ): Task;
  <Creator extends EventCreator>(
    event: Creator,
    effect: TaskEffect<ReturnType<Creator>["payload"]>,
  ): Task;
}

/** Declares event, View, or external-source subscriptions through named Tasks. */
export const task = {
  /**
   * Returns a task collection, registered through `createEvstStore()` or `evst.provide()`.
   * Task names label responses; events or Views passed to `on` select their inputs.
   * Each effect receives event data or the changed View value and returns an optional outcome event.
   */
  subscribe(build: (on: TaskBuilder) => NamedTasks): Tasks {
    const on: TaskBuilder = (...args: any[]): Task => {
      if (args.length === 1) {
        const source = args[0] as TaskSource;
        return {
          register: (_listener, store) => {
            if (!store)
              throw new Error("Source Tasks require a store when registered.");
            let active = true;
            let cleanup: void | (() => void);
            try {
              cleanup = source((outcome) => {
                if (active) store.dispatch(outcome);
              });
            } catch (error) {
              active = false;
              throw error;
            }
            return () => {
              if (!active) return;
              active = false;
              cleanup?.();
            };
          },
        };
      }
      const source = args[0] as EventCreator | View<any, any>;
      const event = "type" in source ? (source as EventCreator) : undefined;
      const selectedViews = event
        ? []
        : (args.slice(0, -1) as View<any, any>[]);
      const effect = args.at(-1) as (
        ...values: any[]
      ) => Outcome | Promise<Outcome>;
      return {
        register: (listener) => {
          const stop = listener.startListening({
            predicate: (action, currentState, previousState) =>
              event
                ? action.type === event.type
                : selectedViews.some(
                    (view) =>
                      !Object.is(view(currentState), view(previousState)),
                  ),
            effect: async (action, api) => {
              try {
                const currentState = api.getState();
                const result = event
                  ? effect(action.payload)
                  : effect(...selectedViews.map((view) => view(currentState)));
                // Preserve synchronous outcomes for optimistic updates.
                const outcome =
                  result && "then" in result ? await result : result;
                if (!api.signal.aborted && outcome) api.dispatch(outcome);
              } catch (error) {
                if (!api.signal.aborted) throw error;
              }
            },
          });
          return () => stop({ cancelActive: true });
        },
      };
    };
    const namedTasks = build(on);
    return {
      register: (listener, store) => {
        const stops: Array<() => void> = [];
        try {
          for (const task of Object.values(namedTasks)) {
            stops.push(task.register(listener, store));
          }
        } catch (error) {
          stops.forEach((stop) => stop());
          throw error;
        }
        return () => stops.forEach((stop) => stop());
      },
    };
  },
};

/** @deprecated Use task.subscribe(). */
export const tasks = task.subscribe;
