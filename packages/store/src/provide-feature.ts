import {
  makeEnvironmentProviders,
  type EnvironmentProviders,
} from "@angular/core";
import {
  provideEffects,
  getEffectsMetadata,
  type FunctionalEffect,
} from "@ngrx/effects";
import { provideState, type ActionReducer } from "@ngrx/store";
import type { Event } from "./events.js";

type EffectSource = Parameters<typeof provideEffects>[number];
/** An effect class, named effect record, functional effect, or array of these. */
export type EffectInput =
  | EffectSource
  | FunctionalEffect
  | readonly EffectInput[];

// Preserve source identity so repeated registration follows NgRx's deduplication.
const functionalSources = new WeakMap<
  FunctionalEffect,
  Record<string, FunctionalEffect>
>();

/**
 * Converts Sugar effect inputs into sources accepted by NgRx `provideEffects()`.
 * Recursively flattens nested arrays and wraps individual functional effects in
 * `{ effect }` records. NgRx effect metadata distinguishes functional effects
 * from effect classes; classes and existing named records pass through unchanged.
 *
 * Each functional effect's wrapper is cached in a WeakMap. Reusing the same
 * wrapper preserves source identity so NgRx can deduplicate registrations,
 * including registration through both `effect.provide()` and `defineState()`.
 * This helper only prepares sources; it does not execute or register effects.
 *
 * @param inputs - Effect classes, named records, functional effects, or nested arrays.
 * @returns A flat array of effect classes and records for `provideEffects()`.
 *
 * @example
 * ```ts
 * normalizeEffects([BooksEffects, [loadBooks], { saveBooks }]);
 * // [BooksEffects, { effect: loadBooks }, { saveBooks }]
 * // Repeated calls with loadBooks reuse the same { effect: loadBooks } object.
 * ```
 *
 * @internal
 */
export function normalizeEffects(inputs: readonly EffectInput[]): EffectSource[] {
  return inputs.flatMap((input): EffectSource[] => {
    if (Array.isArray(input)) return normalizeEffects(input);
    if (
      typeof input === "function" &&
      getEffectsMetadata({ effect: input }).effect
    ) {
      const effect = input as FunctionalEffect;
      let source = functionalSources.get(effect);
      if (!source) {
        source = { effect };
        functionalSources.set(effect, source);
      }
      return [source];
    }
    return [input as EffectSource];
  });
}

/**
 * Registers feature state and optional effects in an environment injector.
 * Supports application and route providers. Requires `provideStore()` at the
 * application root.
 *
 * @param feature - Feature name and reducer, such as a NgRx `createFeature()` result.
 * @param effects - Effect classes, named functional-effect records, individual
 * functional effects, or nested arrays of these, including readonly arrays.
 * @returns Environment providers for the feature state and its effects.
 *
 * @internal
 */
export function provideFeature<State, FeatureEvent extends Event = Event>(
  feature: { name: string; reducer: ActionReducer<State, FeatureEvent> },
  ...effects: EffectInput[]
): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideState(feature),
    provideEffects(...normalizeEffects(effects)),
  ]);
}
