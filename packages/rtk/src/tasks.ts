import { definitionKind } from "./definition-kind.js";
import type {
  EnhancedStore,
  ListenerMiddlewareInstance,
} from "@reduxjs/toolkit";
import type { View } from "./view.js";

type EventCreator = ((...args: any[]) => { type: string; payload: any }) & {
  type: string;
};
type Outcome = { type: string } | (() => void) | void;

export type TaskEffect<Payload = void> = (
  payload: Payload,
) => Outcome | Promise<Outcome>;

/** Runs on registration and can return an event, cleanup, or nothing, synchronously or asynchronously. */
export type TaskSource = () => Outcome | Promise<Outcome>;
type TaskStore = Pick<EnhancedStore, "dispatch">;

/** Side effect activated when its task collection is registered. */
export type Task = {
  register(listener: ListenerMiddlewareInstance, store?: TaskStore): () => void;
};
/** Tasks keyed by descriptive names. */
export type NamedTasks = Record<string, Task>;
export interface Tasks<Effects extends NamedTasks = NamedTasks> {
  readonly [definitionKind]: "tasks";
  readonly effects: Readonly<Effects>;
  register(listener: ListenerMiddlewareInstance, store?: TaskStore): () => void;
}
type ViewSelector = (state: any) => unknown;
type ViewValues<Views extends readonly ViewSelector[]> = {
  [Index in keyof Views]: ReturnType<Views[Index]>;
};

/** Creates event-triggered, View-triggered, or external-source Tasks. */
export interface TaskBuilder {
  /** Runs once on registration; returned events are dispatched and returned functions become cleanup. */
  (effect: TaskSource): Task;
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

/**
 * Declares named Tasks. Registration through createEvstStore() or store.provide()
 * activates their subscriptions. Effects are exposed by name for inspection.
 * @param build - Creates Tasks with the supplied event, View, or source builder.
 * @returns A collection exposing effects and register().
 */
export function task<Effects extends NamedTasks>(
  build: (on: TaskBuilder) => Effects,
): Tasks<Effects> {
  const on: TaskBuilder = (...args: any[]): Task => {
    const startup = args.length === 1;
    const source = args[0] as EventCreator | View<any, any>;
    const event =
      !startup && "type" in source ? (source as EventCreator) : undefined;
    const selectedViews =
      startup || event ? [] : (args.slice(0, -1) as View<any, any>[]);
    const effect = args.at(-1) as (
      ...values: any[]
    ) => Outcome | Promise<Outcome>;
    return {
      register: (listener, store) => {
        let active = true;
        let generation = 0;
        let cleanup: (() => void) | undefined;
        const clean = () => {
          const previous = cleanup;
          cleanup = undefined;
          previous?.();
        };
        const run = (dispatch: TaskStore["dispatch"], values: any[]) => {
          const invocation = ++generation;
          clean();
          if (!active || invocation !== generation) return;
          const accept = (outcome: unknown) => {
            if (typeof outcome === "function") {
              if (active && invocation === generation)
                cleanup = outcome as () => void;
              else (outcome as () => void)();
            } else if (
              active &&
              outcome !== null &&
              typeof outcome === "object" &&
              "type" in outcome &&
              typeof outcome.type === "string"
            ) {
              dispatch(outcome as { type: string });
            }
          };
          const result = effect(...values);
          // Keep synchronous outcomes synchronous for optimistic updates.
          if (
            result &&
            typeof (result as Promise<Outcome>).then === "function"
          ) {
            return Promise.resolve(result).then(accept);
          }
          accept(result);
        };
        const dispose = () => {
          if (!active) return;
          active = false;
          clean();
        };
        if (startup) {
          if (!store)
            throw new Error("Startup Tasks require a store when registered.");
          try {
            const pending = run(store.dispatch, []);
            pending?.catch((error) => {
              if (active) console.error("EVST startup Task failed", error);
            });
          } catch (error) {
            dispose();
            throw error;
          }
          return dispose;
        }
        const stop = listener.startListening({
          predicate: (action, currentState, previousState) =>
            event
              ? action.type === event.type
              : selectedViews.some(
                  (view) => !Object.is(view(currentState), view(previousState)),
                ),
          effect: async (action, api) => {
            try {
              const currentState = api.getState();
              await run(
                api.dispatch,
                event
                  ? [action.payload]
                  : selectedViews.map((view) => view(currentState)),
              );
            } catch (error) {
              if (!api.signal.aborted) throw error;
            }
          },
        });
        return () => {
          stop({ cancelActive: true });
          dispose();
        };
      },
    };
  };
  const namedTasks = build(on);
  return {
    [definitionKind]: "tasks",
    effects: namedTasks,
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
}
