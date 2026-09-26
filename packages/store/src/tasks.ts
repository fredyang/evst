import { inject, type EnvironmentProviders } from "@angular/core";
import {
  Actions,
  createEffect,
  ofType,
  provideEffects,
  type EffectConfig,
  type FunctionalEffect,
} from "@ngrx/effects";
import type { ActionCreator } from "@ngrx/store";
import type { Observable, OperatorFunction } from "rxjs";

type Task = FunctionalEffect<() => Observable<unknown>> & {
  provide(): EnvironmentProviders;
};
type EffectSource = (...args: any[]) => Observable<unknown>;
type EventPipe<Creators extends readonly ActionCreator[]> = Observable<
  ReturnType<Creators[number]>
>["pipe"];
type TaskDefinition<Source extends EffectSource = () => Observable<unknown>> =
  Task & Source;

export interface TaskBuilder {
  <Source extends () => Observable<unknown>>(
    source: Source,
    options?: EffectConfig,
  ): TaskDefinition<Source>;
  <Creator extends ActionCreator>(
    event: Creator,
    source: (pipe: EventPipe<[Creator]>) => Observable<unknown>,
    options?: EffectConfig,
  ): TaskDefinition;
  <First extends ActionCreator, Second extends ActionCreator>(
    first: First,
    second: Second,
    source: (pipe: EventPipe<[First, Second]>) => Observable<unknown>,
    options?: EffectConfig,
  ): TaskDefinition;
}

export interface Tasks<Effects extends Record<string, TaskDefinition> = {}> {
  /** Generated NgRx functional effects, keyed by the collection definition. */
  readonly effects: Readonly<Effects>;
  provide(): EnvironmentProviders;
}

class TasksCollection<
  Effects extends Record<string, TaskDefinition>,
> implements Tasks<Effects> {
  constructor(readonly effects: Effects) {}
  provide(): EnvironmentProviders {
    return provideEffects(this.effects);
  }
}

/**
 * Defines a named task collection. Each returned property is registered as a
 * task and exposed under `.effects` with the same name.
 *
 * @example
 * ```ts
 * const booksTasks = tasks((on) => ({
 *   load: on(BooksPageEvents.entered, (pipe) => pipe(exhaustMap(loadBooks))),
 * }));
 * ```
 */
export function tasks<Definitions extends Record<string, TaskDefinition>>(
  build: (on: TaskBuilder) => Definitions,
): Tasks<Definitions> {
  const definitions = build(createTask);
  const entries = Object.entries(definitions);
  for (const [name, task] of entries) {
    if (!isTaskDefinition(task)) {
      throw new Error(
        `Task "${name}" must be created with the supplied on function.`,
      );
    }
  }
  return new TasksCollection(definitions);
}

const createTask: TaskBuilder = ((...args: any[]): TaskDefinition => {
  const [first] = args;
  const eventDriven = isActionCreator(first);
  const options = eventDriven
    ? ((typeof args.at(-1) === "function" ? {} : args.at(-1)) ?? {})
    : (args[1] ?? {});
  const source = eventDriven
    ? () => {
        const sourceIndex =
          typeof args.at(-1) === "function" ? args.length - 1 : args.length - 2;
        const eventCreators = args.slice(0, sourceIndex) as ActionCreator[];
        const compose = args[sourceIndex] as (
          pipe: EventPipe<any>,
        ) => Observable<unknown>;
        const events = inject(Actions).pipe(
          ofType(...eventCreators),
        ) as Observable<any>;
        const eventPipe = ((...operators: OperatorFunction<any, any>[]) =>
          operators.reduce(
            (stream, operator) => operator(stream),
            events,
          )) as EventPipe<any>;
        return compose(eventPipe);
      }
    : (first as () => Observable<unknown>);
  const create = createEffect as (
    source: () => Observable<unknown>,
    config: EffectConfig & { functional: true },
  ) => FunctionalEffect;
  const effect = create(source, { ...options, functional: true });
  return Object.assign(effect, {
    provide: () => provideEffects({ effect }),
  });
}) as TaskBuilder;

function isTaskDefinition(value: unknown): value is TaskDefinition {
  return typeof value === "function" && "provide" in value;
}

function isActionCreator(value: unknown): value is ActionCreator {
  return (
    typeof value === "function" &&
    typeof (value as ActionCreator).type === "string"
  );
}
