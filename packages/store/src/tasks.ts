import { inject, type EnvironmentProviders } from "@angular/core";
import {
  Actions,
  createEffect,
  getEffectsMetadata,
  ofType,
  provideEffects,
  type EffectConfig,
  type FunctionalEffect,
} from "@ngrx/effects";
import type { ActionCreator } from "@ngrx/store";
import type { Observable, OperatorFunction } from "rxjs";
import {
  normalizeTasks,
  type TaskInput,
  type TasksInput,
} from "./provide-feature.js";

/** A callable NgRx functional effect with standalone registration support. */
export type Task<
  Source extends () => Observable<unknown> = () => Observable<unknown>,
> = FunctionalEffect<Source> & { provide(): EnvironmentProviders };

export interface Tasks extends TasksInput {
  on(task: Task): this;
  on<Source extends () => Observable<unknown>>(
    source: Source,
    options?: EffectConfig,
  ): this;
  on<Creator extends ActionCreator, Result>(
    event: Creator,
    operators: () => readonly OperatorFunction<ReturnType<Creator>, Result>[],
    options?: EffectConfig,
  ): this;
  toList(): readonly TaskInput[];
  provide(): EnvironmentProviders;
}

class TasksCollection implements Tasks {
  #registered: TaskInput[] = [];

  on<Source extends () => Observable<unknown>>(
    source: Source,
    options?: EffectConfig,
  ): this;
  on<Creator extends ActionCreator, Result>(
    event: Creator,
    operators: () => readonly OperatorFunction<ReturnType<Creator>, Result>[],
    options?: EffectConfig,
  ): this;
  on(
    first: Task | (() => Observable<unknown>) | ActionCreator,
    second?: EffectConfig | (() => readonly OperatorFunction<any, any>[]),
    third?: EffectConfig,
  ): this {
    this.#registered.push(
      second === undefined && isTask(first)
        ? first
        : tasks.on(first as any, second as any, third),
    );
    return this;
  }

  toList(): readonly TaskInput[] {
    return [...this.#registered];
  }

  provide(): EnvironmentProviders {
    return provideEffects(...normalizeTasks(this.#registered));
  }
}

/** Creates a task collection for one feature or application boundary. */
export function tasks(): Tasks {
  return new TasksCollection();
}

export namespace tasks {
  /** Creates one task from an arbitrary Observable source. */
  export function on<Source extends () => Observable<unknown>>(
    source: Source,
    options?: EffectConfig,
  ): Task<Source>;
  /** Creates one task that begins when the supplied event is published. */
  export function on<Creator extends ActionCreator, Result>(
    event: Creator,
    operators: () => readonly OperatorFunction<ReturnType<Creator>, Result>[],
    options?: EffectConfig,
  ): Task;
  export function on(
    first: (() => Observable<unknown>) | ActionCreator,
    second?: EffectConfig | (() => readonly OperatorFunction<any, any>[]),
    third?: EffectConfig,
  ): Task {
    const source =
      typeof second === "function"
        ? () =>
            second().reduce(
              (stream, operator) => operator(stream),
              inject(Actions).pipe(
                ofType(first as ActionCreator),
              ) as Observable<any>,
            )
        : (first as () => Observable<unknown>);
    const options = (typeof second === "function" ? third : second) ?? {};
    const create = createEffect as (
      source: () => Observable<unknown>,
      config: EffectConfig & { functional: true },
    ) => FunctionalEffect;
    const effect = create(source, { ...options, functional: true });
    return Object.assign(effect, {
      provide: () => provideEffects(...normalizeTasks([effect])),
    });
  }
}

function isTask(value: unknown): value is Task {
  return (
    typeof value === "function" &&
    !!getEffectsMetadata({ effect: value }).effect
  );
}
