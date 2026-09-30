import {
  DestroyRef,
  inject,
  isDevMode,
  makeEnvironmentProviders,
  provideAppInitializer,
  type EnvironmentProviders,
} from "@angular/core";
import {
  Store,
  provideStore,
  type Action,
  type RootStoreConfig,
} from "@ngrx/store";
import {
  provideStoreDevtools,
  type StoreDevtoolsOptions,
} from "@ngrx/store-devtools";

let _store: Store | undefined;

/** Configuration for the root Eventify Store and development-time Redux DevTools. */
export type StoreEventifyConfig = RootStoreConfig<object> & {
  /** Omitted options use "NgRx Eventify Store" in development; false disables DevTools. */
  devtools?: StoreDevtoolsOptions | false;
};

/**
 * Provides an empty NgRx root Store, development Redux DevTools, and Eventify's
 * event publishing registration.
 *
 * Feature state belongs in `state(...).provide()` or NgRx's `provideState()`.
 * The empty root reducer map means no reducer is registered directly at the
 * root; registered feature keys still form the Store's runtime state object.
 * Redux DevTools is registered only when Angular development mode is enabled,
 * using "NgRx Eventify Store" when DevTools options are omitted. Supplied objects
 * and option factories are passed through to NgRx without merging defaults.
 * Pass `devtools: false` to omit it in development, or options such as
 * `{ name: "Books" }` to configure the browser extension connection.
 *
 * Event creator `.publish()` methods and state view methods use the Store
 * registered by this provider. One active Store is supported per loaded Eventify module. A
 * second, different Store is rejected; concurrent SSR applications and
 * independent Stores require NgRx's own providers and an injected Store instead
 * of this provider and the shared `.publish()` methods.
 * Register once at the application root, replacing a separate `provideStore()`
 * call. Registration is cleared when its owning injector is destroyed.
 *
 * @param config - NgRx root Store configuration and optional DevTools options.
 * @returns Environment providers for the root Store, DevTools in development,
 * and Eventify event publishing.
 * @example Configuring an application root Store
 * ```ts
 * const appConfig = {
 *   providers: [
 *     provideStoreEventify({
 *       runtimeChecks: { strictActionSerializability: true },
 *       devtools: { name: "Books" },
 *     }),
 *     books.provide(),
 *   ],
 * };
 * ```
 */
export function provideStoreEventify(
  config: StoreEventifyConfig = {},
): EnvironmentProviders {
  let { devtools, ...storeConfig } = config;
  // Default omitted options without overriding an explicit false or custom options.
  devtools ??= { name: "NgRx Eventify Store" };
  return makeEnvironmentProviders([
    provideStore({}, storeConfig),
    ...(isDevMode() && devtools !== false
      ? [provideStoreDevtools(devtools)]
      : []),
    provideAppInitializer(() => {
      const store = inject(Store);
      const destroyRef = inject(DestroyRef);
      if (_store && _store !== store) {
        throw new Error(
          "NgRx Eventify already has an active Store. Use NgRx providers and an injected Store for independent stores.",
        );
      }
      _store = store;
      destroyRef.onDestroy(() => {
        if (_store === store) {
          _store = undefined;
        }
      });
    }),
  ]);
}

/** @internal Publishes through the explicitly registered application store. */
export function publishEvent(event: Action): void {
  cachedStore().dispatch(event);
}

/** @internal Returns the Store captured during Eventify application initialization. */
export function cachedStore(): Store {
  if (!_store) {
    throw new Error(
      "Register provideStoreEventify() before using NgRx Eventify events or views.",
    );
  }
  return _store;
}
