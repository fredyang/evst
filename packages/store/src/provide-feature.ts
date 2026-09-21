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

function normalizeEffects(inputs: readonly EffectInput[]): EffectSource[] {
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
