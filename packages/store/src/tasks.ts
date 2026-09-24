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
  /** Adds a task created earlier with `tasks.on(...)`. */
  on(task: Task): this;
  /** Adds a task backed by an arbitrary Observable source. */
  on<Source extends () => Observable<unknown>>(
    source: Source,
    options?: EffectConfig,
  ): this;
  /** Adds a task that starts when the supplied event is published. */
  on<Creator extends ActionCreator, Result>(
    event: Creator,
    operators: () => readonly OperatorFunction<ReturnType<Creator>, Result>[],
    options?: EffectConfig,
  ): this;
  /** Returns a readonly snapshot without consuming this collection. */
  toList(): readonly TaskInput[];
  /** Registers all current tasks in an application or route environment injector. */
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

/**
 * Creates a mutable task collection for one feature or application boundary.
 *
 * `.on(task)` includes a task created with the static `tasks.on(...)` form.
 * `.on(source)` adds an arbitrary Observable source. `.on(event, operators)`
 * adds an event-driven task without exposing `Actions` or `ofType()`.
 * `.toList()` returns a snapshot; `.provide()` registers current tasks. Adding
 * tasks after bootstrap does not change already registered providers.
 *
 * @example
 * ```ts
 * const booksTasks = tasks()
 *   .on(BooksPageEvents.entered, () => {
 *     const api = inject(BooksApi);
 *     return [exhaustMap(() => api.load())];
 *   });
 * ```
 */
export function tasks(): Tasks {
  return new TasksCollection();
}

export namespace tasks {
  /**
   * Creates one task from an arbitrary Observable source.
   * Emitted values are dispatched unless `options.dispatch` is false.
   *
   * @param source - Observable factory, which may use injected dependencies.
   * @param options - NgRx effect options; Sugar always uses a functional effect.
   */
  export function on<Source extends () => Observable<unknown>>(
    source: Source,
    options?: EffectConfig,
  ): Task<Source>;
  /**
   * Creates one task that begins when the supplied event is published.
   * The operator factory runs in an injection context and can return ordinary
   * RxJS operators such as `switchMap()` or `exhaustMap()`.
   *
   * @param event - Event creator that starts the task.
   * @param operators - Factory returning operators in execution order.
   * @param options - NgRx effect options; Sugar always uses a functional effect.
   */
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
