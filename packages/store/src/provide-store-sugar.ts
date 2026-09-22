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

let registration: { store: Store; owners: number } | undefined;

/** Configuration for the root Sugar Store and development-time Redux DevTools. */
export type StoreSugarConfig = RootStoreConfig<object> & {
  /** Redux DevTools options. Defaults to "NgRx Sugar Store" in development mode. */
  devtools?: StoreDevtoolsOptions | false;
};

/**
 * Provides an empty NgRx root Store, development Redux DevTools, and Sugar's
 * event publishing registration.
 *
 * Feature state belongs in `state(...).provide()` or NgRx's `provideState()`.
 * The empty root reducer map means no reducer is registered directly at the
 * root; registered feature keys still form the Store's runtime state object.
 * Redux DevTools is registered only when Angular development mode is enabled,
 * using "NgRx Sugar Store" as its default connection name.
 * Pass `devtools: false` to omit it in development, or options such as
 * `{ name: "Books" }` to configure the browser extension connection.
 *
 * Event creator `.publish()` methods dispatch through the Store registered by
 * this provider. One active Store is supported per loaded Sugar module. A
 * second, different Store is rejected; concurrent SSR applications and
 * independent Stores should use `injectPublish()` instead.
 *
 * @param config - NgRx root Store configuration and optional DevTools options.
 * @returns Environment providers for the root Store, DevTools in development,
 * and Sugar event publishing.
 * @example Configuring an application root Store
 * ```ts
 * const appConfig = {
 *   providers: [
 *     provideStoreSugar({
 *       runtimeChecks: { strictActionSerializability: true },
 *       devtools: { name: "Books" },
 *     }),
 *     books.provide(),
 *   ],
 * };
 * ```
 */
export function provideStoreSugar(
  config: StoreSugarConfig = {},
): EnvironmentProviders {
  let { devtools, ...storeConfig } = config;
  // A recognizable default keeps multiple development stores distinguishable.
  devtools ??= { name: "NgRx Sugar Store" };
  return makeEnvironmentProviders([
    provideStore({}, storeConfig),
    ...(isDevMode() && devtools !== false
      ? [provideStoreDevtools(devtools)]
      : []),
    provideAppInitializer(() => {
      const store = inject(Store);
      const destroyRef = inject(DestroyRef);
      if (registration && registration.store !== store) {
        throw new Error(
          "NgRx Sugar already has an active Store. Use injectPublish() for independent stores.",
        );
      }
      const current = (registration ??= { store, owners: 0 });
      current.owners++;
      destroyRef.onDestroy(() => {
        if (--current.owners === 0 && registration === current) {
          registration = undefined;
        }
      });
    }),
  ]);
}

/** @internal Publishes through the explicitly registered application store. */
export function publishEvent(event: Action): void {
  if (!registration) {
    throw new Error(
      "Register provideStoreSugar() before publishing NgRx Sugar events.",
    );
  }
  registration.store.dispatch(event);
}
