import {
  configureStore,
  combineReducers,
  createListenerMiddleware,
  type ConfigureStoreOptions,
  type EnhancedStore,
  type Reducer,
  type Middleware,
  type Tuple,
  type ThunkMiddleware,
  type UnknownAction,
  type StoreEnhancer,
  type TSHelpersExtractDispatchExtensions,
} from "@reduxjs/toolkit";
import { definitionKind } from "./definition-kind.js";
import type { Tasks, NamedTasks, Task } from "./tasks.js";

let stopActiveTasks: (() => void) | undefined;
let activeStore: Pick<EnhancedStore, "dispatch" | "getState"> | undefined;

/** A feature definition or an independent task collection. */
export type EvstRegistration =
  | Tasks
  | {
      readonly [definitionKind]: "feature";
      readonly name: string;
      readonly reducer: Reducer<any>;
      readonly effects?: Readonly<NamedTasks>;
    };
type UnionToIntersection<U> = (
  U extends unknown ? (value: U) => void : never
) extends (value: infer I) => void
  ? I
  : never;
type FeatureState<D> = D extends {
  name: infer N extends string;
  reducer: Reducer<infer S>;
}
  ? Record<N, S>
  : {};
/** State inferred from all features passed at store creation. Lazy features are registered at runtime. */
export type EvstRootState<D extends readonly EvstRegistration[]> = [
  D[number],
] extends [never]
  ? {}
  : UnionToIntersection<FeatureState<D[number]>>;
type DefaultMiddleware<S> = Tuple<[ThunkMiddleware<S, UnknownAction>]>;
type DefaultEnhancers<M extends Tuple<Middleware<any>[]>> = Tuple<
  [StoreEnhancer<{ dispatch: TSHelpersExtractDispatchExtensions<M> }>]
>;

/** Redux Toolkit configuration; EVST supplies the reducer and retains its listener middleware. */
export type EvstStoreConfig<
  S = any,
  M extends Tuple<Middleware<S>[]> = DefaultMiddleware<S>,
  E extends Tuple<StoreEnhancer[]> = DefaultEnhancers<M>,
  P = S,
> = Omit<ConfigureStoreOptions<S, UnknownAction, M, E, P>, "reducer"> & {
  reducer?: never;
};

/** A standard Redux Toolkit store with additional lazy registration. */
export type Evst<
  S = any,
  E extends Tuple<StoreEnhancer[]> = DefaultEnhancers<DefaultMiddleware<S>>,
> = EnhancedStore<S, UnknownAction, E> & {
  /** Registers features and standalone tasks. State keys follow Redux reducer-map replacement behavior. */
  provide(...definitions: EvstRegistration[]): void;
};

/**
 * Creates a store from feature and task definitions. An optional final argument
 * configures Redux Toolkit. User middleware is retained alongside EVST's listener.
 * Standard Redux store methods remain available. Registering a different reducer
 * under an existing feature name replaces that reducer and retains current state.
 */
export function createEvstStore<const D extends readonly EvstRegistration[]>(
  ...definitions: D
): Evst<EvstRootState<D>>;
export function createEvstStore<
  const D extends readonly EvstRegistration[],
  M extends Tuple<Middleware<EvstRootState<D>>[]> = DefaultMiddleware<
    EvstRootState<D>
  >,
  E extends Tuple<StoreEnhancer[]> = DefaultEnhancers<M>,
  P extends Partial<EvstRootState<D>> = Partial<EvstRootState<D>>,
>(
  ...args: [...D, EvstStoreConfig<EvstRootState<D>, M, E, P>]
): Evst<EvstRootState<D>, E>;
export function createEvstStore(...args: any[]): Evst {
  if (activeStore)
    throw new Error(
      "EVST already has an active Store. Call clearEvstStore() before configuring another store.",
    );
  const last = args.at(-1);
  const options = last && !isDefinition(last) ? args.pop() : {};
  const definitions: EvstRegistration[] = args;
  for (const definition of definitions) {
    if (!isDefinition(definition))
      throw new Error(
        "Expected an EVST definition or task collection; store options must be last.",
      );
  }
  const listener = createListenerMiddleware();
  const reducers: Record<string, Reducer> = Object.create(null);
  for (const definition of definitions) {
    if (definition[definitionKind] === "feature")
      reducers[definition.name] = definition.reducer;
  }
  const rootReducer = () =>
    Object.keys(reducers).length
      ? combineReducers(reducers)
      : (state: any = {}) => state;
  const store = configureStore({
    ...options,
    reducer: rootReducer(),
    middleware: (defaults) => {
      const middleware = options.middleware
        ? options.middleware(defaults)
        : defaults();
      return middleware.prepend(listener.middleware);
    },
  });
  activeStore = store;
  // Preserve individual task identity across immutable feature branches.
  const installedTasks = new Set<Task>();
  const taskStops: Array<() => void> = [];
  const provide = (...entries: EvstRegistration[]) => {
    for (const entry of entries) {
      if (!isDefinition(entry))
        throw new Error("Expected an EVST definition or task collection.");
    }
    let changed = false;
    for (const entry of entries) {
      if (
        entry[definitionKind] === "feature" &&
        reducers[entry.name] !== entry.reducer
      ) {
        reducers[entry.name] = entry.reducer;
        changed = true;
      }
    }
    if (changed) store.replaceReducer(rootReducer());
    const installed: Array<{ task: Task; stop: () => void }> = [];
    try {
      for (const entry of entries) {
        for (const effect of Object.values(entry.effects ?? {})) {
          if (installedTasks.has(effect)) continue;
          // Reserve before starting sources, which can synchronously dispatch.
          installedTasks.add(effect);
          try {
            installed.push({
              task: effect,
              stop: effect.register(listener, store),
            });
          } catch (error) {
            installedTasks.delete(effect);
            throw error;
          }
        }
      }
    } catch (error) {
      for (const { task, stop } of installed) {
        stop();
        installedTasks.delete(task);
      }
      throw error;
    }
    taskStops.push(...installed.map(({ stop }) => stop));
  };
  stopActiveTasks = () => {
    taskStops.splice(0).forEach((stop) => stop());
  };
  try {
    provide(...definitions);
  } catch (error) {
    clearEvstStore();
    throw error;
  }
  return Object.assign(store, { provide });
}

function isDefinition(value: unknown): value is EvstRegistration {
  return (
    typeof value === "object" &&
    value !== null &&
    definitionKind in value &&
    (value[definitionKind] === "feature" || value[definitionKind] === "tasks")
  );
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
