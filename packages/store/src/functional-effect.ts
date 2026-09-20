import { createEffect, type EffectConfig, type FunctionalEffect } from "@ngrx/effects";
import type { Observable } from "rxjs";

/** Forwards effect options, always overriding functional to true. */
export function functionalEffect<Source extends () => Observable<unknown>>(
  source: Source,
  options: EffectConfig = {},
): FunctionalEffect<Source> {
  // NgRx's overloads require literal dispatch flags; this adapter forwards either.
  const create = createEffect as (
    source: Source,
    config: EffectConfig & { functional: true },
  ) => FunctionalEffect<Source>;
  return create(source, { ...options, functional: true });
}
