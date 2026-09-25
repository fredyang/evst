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

type EventPipe<Creator extends ActionCreator> = Observable<
  ReturnType<Creator>
>["pipe"];

export interface Tasks extends TasksInput {
  /** Adds a task created earlier with `tasks.on(...)`. */
  on(task: Task): this;
  /** Adds a task backed by an arbitrary Observable source. */
  on<Source extends () => Observable<unknown>>(
    source: Source,
    options?: EffectConfig,
  ): this;
  /** Adds a task that starts when the supplied event is published. */
  on<Creator extends ActionCreator>(
    event: Creator,
    source: (pipe: EventPipe<Creator>) => Observable<unknown>,
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
  on<Creator extends ActionCreator>(
    event: Creator,
    source: (pipe: EventPipe<Creator>) => Observable<unknown>,
    options?: EffectConfig,
  ): this;
  on(
    first: Task | (() => Observable<unknown>) | ActionCreator,
    second?: EffectConfig | ((pipe: EventPipe<any>) => Observable<unknown>),
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
 * `.on(source)` adds an arbitrary Observable source. `.on(event, source)`
 * adds an event-driven task without exposing `Actions` or `ofType()`. The
 * source receives a typed event `pipe` for composing RxJS operators.
 * `.toList()` returns a snapshot; `.provide()` registers current tasks. Adding
 * tasks after bootstrap does not change already registered providers.
 *
 * @example
 * ```ts
 * const booksTasks = tasks()
 *   .on(BooksPageEvents.entered, (pipe) => {
 *     const api = inject(BooksApi);
 *     return pipe(exhaustMap(() => api.load()));
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
   * The source runs in an injection context and receives a typed RxJS pipe.
   *
   * @param event - Event creator that starts the task.
   * @param source - Factory that composes operators with the event pipe.
   * @param options - NgRx effect options; Sugar always uses a functional effect.
   */
  export function on<Creator extends ActionCreator>(
    event: Creator,
    source: (pipe: EventPipe<Creator>) => Observable<unknown>,
    options?: EffectConfig,
  ): Task;
  export function on(
    first: (() => Observable<unknown>) | ActionCreator,
    second?: EffectConfig | ((pipe: EventPipe<any>) => Observable<unknown>),
    third?: EffectConfig,
  ): Task {
    const source =
      typeof second === "function"
        ? () => {
            const events = inject(Actions).pipe(
              ofType(first as ActionCreator),
            ) as Observable<any>;
            const eventPipe = ((...operators: OperatorFunction<any, any>[]) =>
              operators.reduce(
                (stream, operator) => operator(stream),
                events,
              )) as EventPipe<any>;
            return second(eventPipe);
          }
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
