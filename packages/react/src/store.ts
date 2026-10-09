import {
  configureStore,
  createListenerMiddleware,
  type ConfigureStoreOptions,
  type EnhancedStore,
  type Reducer,
} from "@reduxjs/toolkit";
import type { FeatureStateDefinition } from "./state.js";
import type { Tasks } from "./tasks.js";

let activeStore: Pick<EnhancedStore, "dispatch"> | undefined;

export type EvstStoreConfig = Omit<
  ConfigureStoreOptions,
  "reducer" | "middleware"
> & {
  features: readonly FeatureStateDefinition<any, any>[];
  tasks?: readonly Tasks[];
};

/** Creates the Redux Toolkit store, installs EVST tasks, and enables `.publish()`. */
export function createEvstStore(config: EvstStoreConfig) {
  const listener = createListenerMiddleware();
  const { features, tasks, ...options } = config;
  const reducer = Object.fromEntries(
    features.map((feature) => [feature.name, feature.reducer]),
  ) as Record<string, Reducer>;
  const store = configureStore({
    ...options,
    reducer: reducer as any,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().prepend(listener.middleware),
  });
  if (activeStore && activeStore !== store) {
    throw new Error(
      "EVST already has an active Store. Call clearEvstStore() before configuring another store.",
    );
  }
  activeStore = store;
  for (const task of tasks ?? []) task.register(listener);
  return store;
}

/** Dispatches an event through the store initialized by `createEvstStore()`. */
export function publish(
  action: Parameters<EnhancedStore["dispatch"]>[0],
): void {
  if (!activeStore)
    throw new Error("Create an EVST store before publishing events.");
  activeStore.dispatch(action);
}

/** Clears the process-wide event publisher. Useful in tests and isolated applications. */
export function clearEvstStore(): void {
  activeStore = undefined;
}
