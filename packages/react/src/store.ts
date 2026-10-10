import {
  configureStore,
  combineReducers,
  createListenerMiddleware,
  type ConfigureStoreOptions,
  type EnhancedStore,
  type Reducer,
} from "@reduxjs/toolkit";
import type { FeatureStateDefinition } from "./state.js";
import type { Tasks } from "./tasks.js";

let activeStore: Pick<EnhancedStore, "dispatch" | "getState"> | undefined;

export type EvstStoreConfig = Omit<
  ConfigureStoreOptions,
  "reducer" | "middleware"
> & {
  features?: readonly FeatureStateDefinition<any, any>[];
  tasks?: readonly Tasks[];
};

/** Creates the store, installs tasks, and enables event publishing and View snapshots. */
export function createEvstStore(config: EvstStoreConfig = {}) {
  const listener = createListenerMiddleware();
  const { features = [], tasks, ...options } = config;
  const reducer = Object.fromEntries(
    features.map((feature) => [feature.name, feature.reducer]),
  ) as Record<string, Reducer>;
  const rootReducer: Reducer<any> = Object.keys(reducer).length
    ? combineReducers(reducer)
    : (state = {}) => state;
  const store = configureStore({
    ...options,
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().prepend(listener.middleware),
  });
  if (activeStore && activeStore !== store) {
    throw new Error(
      "EVST already has an active Store. Call clearEvstStore() before configuring another store.",
    );
  }
  activeStore = store;
  const registered = new Map(
    features.map((feature) => [feature.name, feature]),
  );
  const installedTasks = new Set<Tasks>();
  /** Registers lazy features and tasks once, retaining them for the store lifetime. */
  const provide = (
    registration: Pick<EvstStoreConfig, "features" | "tasks">,
  ) => {
    const proposed = new Map(registered);
    for (const feature of registration.features ?? []) {
      const existing = proposed.get(feature.name);
      if (existing && existing !== feature) {
        throw new Error(
          `EVST feature "${feature.name}" is already registered.`,
        );
      }
      proposed.set(feature.name, feature);
    }
    let changed = false;
    for (const feature of registration.features ?? []) {
      if (registered.has(feature.name)) continue;
      registered.set(feature.name, feature);
      reducer[feature.name] = feature.reducer;
      changed = true;
    }
    if (changed) store.replaceReducer(combineReducers(reducer));
    for (const definition of registration.tasks ?? []) {
      if (installedTasks.has(definition)) continue;
      definition.register(listener);
      installedTasks.add(definition);
    }
  };
  provide({ tasks });
  return Object.assign(store, { provide });
}

/** Dispatches an event through the store initialized by `createEvstStore()`. */
export function publish(
  action: Parameters<EnhancedStore["dispatch"]>[0],
): void {
  if (!activeStore)
    throw new Error("Create an EVST store before publishing events.");
  activeStore.dispatch(action);
}

/** @internal Reads a snapshot from the active store without subscribing. */
export function readView<Root, Result>(
  selector: (root: Root) => Result,
): Result {
  if (!activeStore)
    throw new Error("Create an EVST store before reading View values.");
  return selector(activeStore.getState());
}

/** Clears the active store used by event publishing and View snapshots. */
export function clearEvstStore(): void {
  activeStore = undefined;
}
