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
/** A task class, named task record, functional task, or array of these. */
export type TaskInput = EffectSource | FunctionalEffect | readonly TaskInput[];

// Preserve source identity so repeated registration follows NgRx's deduplication.
const functionalSources = new WeakMap<
  FunctionalEffect,
  Record<string, FunctionalEffect>
>();

/**
 * Converts Sugar task inputs into sources accepted by NgRx `provideEffects()`.
 * Recursively flattens nested arrays and wraps individual functional tasks in
 * `{ effect }` records. NgRx effect metadata distinguishes functional effects
 * from effect classes; classes and existing named records pass through unchanged.
 *
 * Each functional task's wrapper is cached in a WeakMap. Reusing the same
 * wrapper preserves source identity so NgRx can deduplicate registrations,
 * including registration through both `task.provide()` and `state()`.
 * This helper only prepares sources; it does not execute or register tasks.
 *
 * @param inputs - Task classes, named records, functional tasks, or nested arrays.
 * @returns A flat array of effect classes and records for `provideEffects()`.
 *
 * @example
 * ```ts
 * normalizeTasks([BooksTasks, [loadBooks], { saveBooks }]);
 * // [BooksTasks, { effect: loadBooks }, { saveBooks }]
 * // Repeated calls with loadBooks reuse the same wrapper object.
 * ```
 *
 * @internal
 */
export function normalizeTasks(inputs: readonly TaskInput[]): EffectSource[] {
  return inputs.flatMap((input): EffectSource[] => {
    if (Array.isArray(input)) return normalizeTasks(input);
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
 * Registers feature state and optional tasks in an environment injector.
 * Supports application and route providers. Requires `provideStore()` at the
 * application root.
 *
 * @param feature - Feature name and reducer, such as a NgRx `createFeature()` result.
 * @param tasks - Task classes, named functional-task records, individual
 * functional tasks, or nested arrays of these, including readonly arrays.
 * @returns Environment providers for the feature state and its tasks.
 *
 * @internal
 */
export function provideFeature<State, FeatureAction extends Action = Action>(
  feature: { name: string; reducer: ActionReducer<State, FeatureAction> },
  ...tasks: TaskInput[]
): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideState(feature),
    provideEffects(...normalizeTasks(tasks)),
  ]);
}
