import type { ListenerMiddlewareInstance } from "@reduxjs/toolkit";

type EventCreator = ((...args: any[]) => { type: string; payload: any }) & {
  type: string;
};
type Outcome = { type: string } | void;

export type TaskEffect<Payload = void> = (
  payload: Payload,
) => Outcome | Promise<Outcome>;

/** Event-driven side effect registered through RTK listener middleware. */
export type Task = {
  register(listener: ListenerMiddlewareInstance): () => void;
};
/** Tasks keyed by descriptive names. */
export type NamedTasks = Record<string, Task>;
export interface Tasks {
  register(listener: ListenerMiddlewareInstance): () => void;
}
/** Associates an event with a Task receiving its payload. */
export type TaskBuilder = <Creator extends EventCreator>(
  event: Creator,
  effect: TaskEffect<ReturnType<Creator>["payload"]>,
) => Task;

/** Declares event subscriptions through named Tasks. */
export const task = {
  /**
   * Returns a task collection, registered through `createEvst()` or `evst.provide()`.
   * Task names label responses; events passed to `on` select their inputs.
   * Each effect receives event data and returns an optional outcome event.
   */
  subscribe(build: (on: TaskBuilder) => NamedTasks): Tasks {
    const on: TaskBuilder = (event, effect) => {
      return {
        register: (listener) => {
          const stop = listener.startListening({
            predicate: (action): action is ReturnType<typeof event> =>
              action.type === event.type,
            effect: async (action, api) => {
              try {
                const result = effect(action.payload);
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
      register: (listener) => {
        const stops = Object.values(namedTasks).map((task) =>
          task.register(listener),
        );
        return () => stops.forEach((stop) => stop());
      },
    };
  },
};

/** @deprecated Use task.subscribe(). */
export const tasks = task.subscribe;
