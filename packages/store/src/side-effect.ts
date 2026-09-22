import type { EnvironmentProviders } from "@angular/core";
import {
  createEffect,
  provideEffects,
  type EffectConfig,
  type FunctionalEffect,
} from "@ngrx/effects";
import type { Observable } from "rxjs";
import { normalizeEffects } from "./provide-feature.js";

/** A callable functional effect with application or route registration support. */
export type SideEffect<
  Source extends () => Observable<unknown> = () => Observable<unknown>,
> = FunctionalEffect<Source> & {
  /** Registers this effect in an environment injector; requires a root Store. */
  provide(): EnvironmentProviders;
};

/**
 * Defines a callable functional effect with standalone registration support.
 * Emitted events are dispatched unless `dispatch: false` is supplied.
 * Creating the effect does not execute its source; NgRx runs it on registration.
 * A dispatching source must emit NgRx Action values; a non-dispatching source
 * can emit other values. This helper listens to observables, unlike Angular's
 * signal-based effect(). Injected defaults require an injection context when
 * calling the source directly; tests can pass dependencies explicitly.
 *
 * @param source - Observable factory, optionally accepting injected dependencies.
 * @param options - NgRx effect options; `functional` is always set to true.
 * @returns The callable effect with a `provide()` method for application or route providers.
 *
 * @example
 * ```ts
 * const idleEffect = sideEffect(() =>
 *   timer(300_000).pipe(map(() => userEvents.idleTimeout()))
 * );
 * // Application providers: [provideStoreSugar(), idleEffect.provide()]
 * // State-owned effects: state('feature', initialState).effects([idleEffect])
 * ```
 */
export function sideEffect<Source extends () => Observable<unknown>>(
  source: Source,
  options: EffectConfig = {},
): SideEffect<Source> {
  // NgRx's overloads require literal dispatch flags; this adapter forwards either.
  const create = createEffect as (
    source: Source,
    config: EffectConfig & { functional: true },
  ) => FunctionalEffect<Source>;
  const effect = create(source, { ...options, functional: true });
  return Object.assign(effect, {
    provide: () => provideEffects(...normalizeEffects([effect])),
  });
}

// effect()
