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

/** Function that builds a task's observable pipeline. */
export type TaskSource = (...args: any[]) => Observable<unknown>;
/** Callable NgRx functional effect with environment-provider registration. */
export type Task<Source extends TaskSource = () => Observable<unknown>> =
  FunctionalEffect<Source> & {
    provide(): EnvironmentProviders;
  };
/** Tasks keyed by descriptive names, also exposed under `.effects`. */
export type NamedTasks = Record<string, Task>;
type EventPipe<Creators extends readonly ActionCreator[]> = Observable<
  ReturnType<Creators[number]>
>["pipe"];

/**
 * Creates a Task for a `task()` collection.
 *
 * The builder is supplied as `on` to the callback passed to `task`.
 * Tasks can be defined from an observable source, or scoped to one or more events.
 * Event-scoped tasks receive a `pipe` function whose source emits only the
 * selected event types.
 *
 * @example
 * ```ts
 * const booksTasks = task((on) => ({
 *   load: on(fromBooksPage.entered, (pipe) =>
 *     pipe(
 *       exhaustMap(() => booksApi.getAll()),
 *       map((books) => fromBooksApi.loaded({ books })),
 *     ),
 *   ),
 * }));
 * ```
 */
export interface TaskBuilder {
  /**
   * Creates a task from an observable source that is subscribed when its effects are provided.
   *
   * @param source - Function that returns the task source observable.
   * @param options - NgRx effect configuration.
   * @returns A Task for a `task()` collection.
   */
  <Source extends () => Observable<unknown>>(
    source: Source,
    options?: EffectConfig,
  ): Task<Source>;
  /** Creates a task that runs for one or more event types. */
  <Creators extends readonly ActionCreator[]>(
    ...args: [
      ...Creators,
      source: (pipe: EventPipe<Creators>) => Observable<unknown>,
    ]
  ): Task;
  <Creators extends readonly ActionCreator[]>(
    ...args: [
      ...Creators,
      source: (pipe: EventPipe<Creators>) => Observable<unknown>,
      options: EffectConfig,
    ]
  ): Task;
}

/** A named collection of EVST tasks that can be registered together. */
export interface Tasks<Effects extends NamedTasks = {}> {
  /**
   * Generated NgRx functional effects, keyed by task name.
   *
   * Effects are normally registered through `provide()` rather than consumed
   * directly. This property is primarily useful in unit tests.
   */
  readonly effects: Readonly<Effects>;
  /**
   * Registers every task in this collection with the current Angular injector.
   *
   * @returns Environment providers for every task in the collection.
   */
  provide(): EnvironmentProviders;
}

class TasksCollection<Effects extends NamedTasks> implements Tasks<Effects> {
  constructor(readonly effects: Effects) {}
  provide(): EnvironmentProviders {
    return provideEffects(this.effects);
  }
}

/**
 * Declares event subscriptions through named Tasks.
 * Returns a task collection whose subscriptions take effect when its environment
 * providers are registered. Each Task is exposed under `.effects` with its name.
 * Task keys are descriptive labels; they do not name subscribed
 * events. The event creators passed to `on` determine which events each task
 * receives.
 *
 * @param build - Creates named tasks with the supplied `on` builder.
 * @returns A task collection for `provide()` registration.
 * @throws If a returned task was not created with the supplied `on` builder.
 *
 * @example
 * ```ts
 * const booksTasks = task((on) => ({
 *   load: on(fromBooksPage.entered, (pipe) => pipe(exhaustMap(loadBooks))),
 * }));
 * ```
 */
export function task<Subscriptions extends NamedTasks>(
  build: (on: TaskBuilder) => Subscriptions,
): Tasks<Subscriptions> {
  const namedTasks = build(createTask);
  const entries = Object.entries(namedTasks);
  for (const [name, task] of entries) {
    if (!isTask(task)) {
      throw new Error(
        `Task "${name}" must be created with the supplied on function.`,
      );
    }
  }
  return new TasksCollection(namedTasks);
}

const createTask: TaskBuilder = ((...args: any[]): Task => {
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

function isTask(value: unknown): value is Task {
  return typeof value === "function" && "provide" in value;
}

function isActionCreator(value: unknown): value is ActionCreator {
  return (
    typeof value === "function" &&
    typeof (value as ActionCreator).type === "string"
  );
}
