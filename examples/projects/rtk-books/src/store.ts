import {
  combineReducers,
  configureStore,
  createListenerMiddleware,
  type Reducer,
  type UnknownAction,
} from "@reduxjs/toolkit";
import { registerAuthListeners } from "./auth/auth.listeners";
import { authReducer } from "./auth/auth.slice";
import { coreReducer } from "./core/core.slice";
import type { AppState } from "./app-state";

type ReducerMap = Record<string, Reducer>;

function createReducerManager(initialReducers: ReducerMap) {
  const reducers = { ...initialReducers };
  let combined = combineReducers(reducers) as unknown as Reducer<AppState>;

  return {
    //
    reduce: (state: AppState | undefined, action: UnknownAction) =>
      combined(state, action),

    // the reducer manager can add more reducers dynamically
    add(key: string, reducer: Reducer) {
      if (reducers[key]) return false;
      reducers[key] = reducer;
      // recreate the combined reducer with the new set of reducers
      combined = combineReducers(reducers) as unknown as Reducer<AppState>;
      return true;
    },
  };
}

export function createAppStore() {
  //
  // add the first two reducers: auth and core
  const reducerManager = createReducerManager({
    auth: authReducer,
    core: coreReducer,
  });

  const listenerMiddleware = createListenerMiddleware<AppState>();

  const store = configureStore({
    reducer: reducerManager.reduce,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().prepend(listenerMiddleware.middleware),
  });

  registerAuthListeners(listenerMiddleware);

  const installedListeners = new Set<string>();

  const injectFeature = (key: string, reducer: Reducer, setup?: () => void) => {
    const isNewReducer = reducerManager.add(key, reducer);
    if (isNewReducer) {
      // store need to update its reducer when a new reducer is added
      store.replaceReducer(reducerManager.reduce);
    }
    if (setup && !installedListeners.has(key)) {
      setup();
      installedListeners.add(key);
    }
  };

  // add two methods to the store: injectFeature and listenerMiddleware
  return Object.assign(store, { injectFeature, listenerMiddleware });
}

export const store = createAppStore();
export type AppStore = ReturnType<typeof createAppStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
