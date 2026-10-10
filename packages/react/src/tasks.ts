import type { ListenerMiddlewareInstance } from "@reduxjs/toolkit";

type EventCreator = ((...args: any[]) => { type: string; payload: any }) & {
  type: string;
};
type Outcome = { type: string } | void;

export type TaskEffect<Payload = void> = (
  payload: Payload,
) => Outcome | Promise<Outcome>;

type Task = { register(listener: ListenerMiddlewareInstance): () => void };
export interface Tasks {
  register(listener: ListenerMiddlewareInstance): () => void;
}
type On = <Creator extends EventCreator>(
  event: Creator,
  effect: TaskEffect<ReturnType<Creator>["payload"]>,
) => Task;

/** Defines named tasks receiving event data and returning an optional outcome event. */
export const task = {
  handle(build: (on: On) => Record<string, Task>): Tasks {
    const on: On = (event, effect) => {
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
    const definitions = build(on);
    return {
      register: (listener) => {
        const stops = Object.values(definitions).map((definition) =>
          definition.register(listener),
        );
        return () => stops.forEach((stop) => stop());
      },
    };
  },
};

/** @deprecated Use task.handle(). */
export const tasks = task.handle;
