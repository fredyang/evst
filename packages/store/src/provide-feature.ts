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
/** A Sugar task collection that exposes its named functional effects. */
export interface TasksInput {
  readonly effects: Readonly<Record<string, FunctionalEffect>>;
  provide(): EnvironmentProviders;
}
/** A task class, named task record, functional task, or array of these. */
export type TaskInput = EffectSource | FunctionalEffect | readonly TaskInput[];
export type TasksRegistrationInput = TaskInput | TasksInput;

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
 * including registration through a task collection and `state()`.
 * This helper only prepares sources; it does not execute or register tasks.
 *
 * @param inputs - Task classes, named records, functional tasks, task
 * collections, or nested arrays.
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
export function normalizeTasks(
  inputs: readonly TasksRegistrationInput[],
): EffectSource[] {
  return inputs.flatMap((input): EffectSource[] => {
    if (isTasksInput(input))
      return normalizeTasks(Object.values(input.effects));
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

function isTasksInput(input: TasksRegistrationInput): input is TasksInput {
  return (
    typeof input === "object" &&
    input !== null &&
    "effects" in input &&
    typeof input.effects === "object" &&
    input.effects !== null &&
    "provide" in input &&
    typeof input.provide === "function"
  );
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
  ...tasks: TasksRegistrationInput[]
): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideState(feature),
    provideEffects(...normalizeTasks(tasks)),
  ]);
}
