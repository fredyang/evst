import {
  makeEnvironmentProviders,
  type EnvironmentProviders,
} from "@angular/core";

/** A collection of independently defined providers that can be registered together. */
export interface Bundle {
  /** Registers every bundled definition with the current Angular injector. */
  provide(): EnvironmentProviders;
}

interface Provideable {
  provide(): EnvironmentProviders;
}

/**
 * Combines independently defined state and task collections into one provider.
 * Bundling does not change any definition or make state responsible for tasks.
 *
 * @param definitions - State definitions, task collections, or other Eventify providers.
 * @returns A bundle whose `provide()` registers every supplied definition.
 *
 * @example
 * ```ts
 * const books = bundle(booksState, booksTasks);
 *
 * const appConfig = {
 *   providers: [provideStoreEventify(), books.provide()],
 * };
 * ```
 */
export function bundle(...definitions: readonly Provideable[]): Bundle {
  return {
    provide: () =>
      makeEnvironmentProviders(
        definitions.map((definition) => definition.provide()),
      ),
  };
}
