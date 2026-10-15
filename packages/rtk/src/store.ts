import {
  configureStore,
  combineReducers,
  createListenerMiddleware,
  type ConfigureStoreOptions,
  type EnhancedStore,
  type Reducer,
} from "@reduxjs/toolkit";
import type { FeatureStateDefinition, FeatureBundle } from "./state.js";
import type { Tasks } from "./tasks.js";

let stopActiveTasks: (() => void) | undefined;

let activeStore: Pick<EnhancedStore, "dispatch" | "getState"> | undefined;

export type EvstStoreConfig = Omit<
  ConfigureStoreOptions,
  "reducer" | "middleware"
> & {
  states?: readonly FeatureStateDefinition<any, any>[];
  tasks?: readonly Tasks[];
  bundles?: readonly FeatureBundle<any, any>[];
};

export type Evst = EnhancedStore & {
  /** Registers lazy states, Tasks, and bundles once for the store lifetime. */
  provide(
    registration: Pick<EvstStoreConfig, "states" | "tasks" | "bundles">,
  ): void;
};

/** Creates the store, installs tasks, and enables event publishing and View snapshots. */
export function createEvstStore(config: EvstStoreConfig = {}): Evst {
  const listener = createListenerMiddleware();
  const {
    states: suppliedStates = [],
    tasks,
    bundles = [],
    ...options
  } = config;
  const states = [...suppliedStates, ...bundles];
  const registered = new Map<string, (typeof states)[number]>();
  for (const definition of states) {
    const existing = registered.get(definition.name);
    if (existing && existing !== definition)
      throw new Error(`EVST state "${definition.name}" is already registered.`);
    registered.set(definition.name, definition);
  }
  const reducer = Object.fromEntries(
    states.map((state) => [state.name, state.reducer]),
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
  const installedTasks = new Set<Tasks>();
  const taskStops: Array<() => void> = [];
  stopActiveTasks = () => {
    taskStops.splice(0).forEach((stop) => stop());
  };
  const provide = (
    registration: Pick<EvstStoreConfig, "states" | "tasks" | "bundles">,
  ) => {
    const states = [
      ...(registration.states ?? []),
      ...(registration.bundles ?? []),
    ];
    const proposed = new Map(registered);
    for (const state of states) {
      const existing = proposed.get(state.name);
      if (existing && existing !== state) {
        throw new Error(`EVST state "${state.name}" is already registered.`);
      }
      proposed.set(state.name, state);
    }
    let changed = false;
    for (const state of states) {
      if (registered.has(state.name)) continue;
      registered.set(state.name, state);
      reducer[state.name] = state.reducer;
      changed = true;
    }
    if (changed) store.replaceReducer(combineReducers(reducer));
    for (const definition of [
      ...(registration.tasks ?? []),
      ...(registration.bundles ?? []),
    ]) {
      if (installedTasks.has(definition)) continue;
      taskStops.push(definition.register(listener, store));
      installedTasks.add(definition);
    }
  };
  provide({ tasks, bundles });
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

/** Stops registered Tasks and clears the active store used by publishing and Views. */
export function clearEvstStore(): void {
  const stop = stopActiveTasks;
  stopActiveTasks = undefined;
  activeStore = undefined;
  stop?.();
}
