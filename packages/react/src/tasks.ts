import type { Action, ListenerMiddlewareInstance } from "@reduxjs/toolkit";

type EventCreator = ((...args: any[]) => Action) & { type: string };
export type TaskEffect<ActionType extends Action = Action> = Parameters<
  ListenerMiddlewareInstance["startListening"]
>[0] extends { effect: (action: infer Received, ...args: any[]) => any }
  ? (
      action: Extract<Received, ActionType>,
      api: Parameters<ListenerMiddlewareInstance["startListening"]>[0] extends {
        effect: (action: any, api: infer Api) => any;
      }
        ? Api
        : never,
    ) => unknown
  : never;

type Task = { register(listener: ListenerMiddlewareInstance): () => void };
export interface Tasks {
  register(listener: ListenerMiddlewareInstance): () => void;
}

/** Creates listener-middleware tasks that react to one or more events. */
export const task = {
  handle(
    build: (
      on: <Creator extends EventCreator>(
        event: Creator,
        effect: (action: ReturnType<Creator>, api: any) => unknown,
      ) => Task,
    ) => Record<string, Task>,
  ): Tasks {
    const on = <Creator extends EventCreator>(
      event: Creator,
      effect: (action: ReturnType<Creator>, api: any) => unknown,
    ): Task => ({
      register: (listener) =>
        listener.startListening({
          actionCreator: event as any,
          effect: effect as any,
        }),
    });
    const definitions = build(on);
    return {
      register: (listener) =>
        Object.values(definitions)
          .map((definition) => definition.register(listener))
          .reduce((stop, next) => () => {
            stop();
            next();
          }),
    };
  },
};

/** @deprecated Use `task.handle()`. */
export const tasks = task.handle;
