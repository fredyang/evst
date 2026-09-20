import {
  makeEnvironmentProviders,
  type EnvironmentProviders,
} from "@angular/core";
import {
  provideEffects,
  getEffectsMetadata,
  type FunctionalEffect,
} from "@ngrx/effects";
import { provideState, type Action, type ActionReducer } from "@ngrx/store";

type EffectSource = Parameters<typeof provideEffects>[number];
/** An effect class, named effect record, functional effect, or array of these. */
export type EffectInput =
  EffectSource | FunctionalEffect | readonly EffectInput[];

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

/** Registers feature state and its effects in the current environment injector.
 * Requires provideStore() at the application root.
 */
export function provideFeature<State, Event extends Action = Action>(
  feature: { name: string; reducer: ActionReducer<State, Event> },
  ...effects: EffectInput[]
): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideState(feature),
    provideEffects(...normalizeEffects(effects)),
  ]);
}
