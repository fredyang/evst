import { publishEvent } from "./provide-store-sugar.js";
import { createAction } from "@ngrx/store";
import type {
  Action,
  ActionCreator,
  ActionCreatorProps,
  Creator,
  NotAllowedCheck,
} from "@ngrx/store";

type LowerLetter =
  | "a"
  | "b"
  | "c"
  | "d"
  | "e"
  | "f"
  | "g"
  | "h"
  | "i"
  | "j"
  | "k"
  | "l"
  | "m"
  | "n"
  | "o"
  | "p"
  | "q"
  | "r"
  | "s"
  | "t"
  | "u"
  | "v"
  | "w"
  | "x"
  | "y"
  | "z";
type UpperLetter = Uppercase<LowerLetter>;
type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

/** An NgRx props declaration or a function that creates an event payload. */
type EventConfig = ActionCreatorProps<unknown> | Creator;

type StringLiteralCheck<
  Text extends string,
  Name extends string,
> = string extends Text ? `${Name} must be a string literal type` : unknown;

type Alphanumeric<Text extends string> =
  Text extends `${LowerLetter | UpperLetter | Digit}${infer Rest}`
    ? Alphanumeric<Rest>
    : Text extends ""
      ? true
      : false;

type EventKeyCheck<Key extends string> = string extends Key
  ? unknown
  : Key extends `${LowerLetter}${infer Rest}`
    ? Alphanumeric<Rest> extends true
      ? unknown
      : "event key must contain only ASCII letters and digits"
    : "event key must start with a lowercase ASCII letter";

// Split before capitals after lowercase letters/digits, and before the final
// capital of an acronym when a lowercase word follows: loadHTTPError -> Load HTTP Error.
type Words<
  Text extends string,
  Previous extends string = "",
> = Text extends `${infer First}${infer Rest}`
  ? `${First extends UpperLetter
      ? Previous extends LowerLetter | Digit
        ? " "
        : Previous extends UpperLetter
          ? Rest extends `${LowerLetter}${string}`
            ? " "
            : ""
          : ""
      : ""}${First}${Words<Rest, First>}`
  : "";

type EventLabel<Key extends string> = Capitalize<Words<Key>>;

type EventPropsCheck<Config extends EventConfig> =
  Config extends ActionCreatorProps<infer Payload>
    ? Payload extends void
      ? unknown
      : NotAllowedCheck<Payload & object>
    : Config extends Creator<any, infer Result>
      ? NotAllowedCheck<Result>
      : unknown;

/** Infers a creator's arguments and payload while retaining its event type literal. */
type EventCreator<Config extends EventConfig, Type extends string> =
  Config extends ActionCreatorProps<infer Payload>
    ? void extends Payload
      ? ActionCreator<Type, () => Action<Type>>
      : ActionCreator<
          Type,
          (
            props: Payload & NotAllowedCheck<Payload & object>,
          ) => Payload & Action<Type>
        >
    : Config extends Creator<infer Args, infer Result>
      ? ActionCreator<
          Type,
          (...args: Args) => Result & NotAllowedCheck<Result> & Action<Type>
        >
      : never;

/** Event definitions checked for literal camelCase keys and valid NgRx payloads. */
type EventGroupConfig<Events extends Record<string, EventConfig>> = Events & {
  [Key in keyof Events]: StringLiteralCheck<Key & string, "event key"> &
    EventKeyCheck<Key & string> &
    EventPropsCheck<Events[Key]>;
};

type Publishable<Creator extends (...args: any[]) => Action> = Creator & {
  /** Publishes an event through the Store registered by provideStoreSugar(). */
  publish(...args: Parameters<Creator>): void;
};

/** Event creators keyed by the original definitions, with source-prefixed types. */
type EventGroup<
  Source extends string,
  Events extends Record<string, EventConfig>,
> = {
  [Key in keyof Events]: Publishable<
    EventCreator<Events[Key], `[${Source}] ${EventLabel<Key & string>}`>
  >;
};

/**
 * Creates a group of events with a shared source, unchanged camelCase keys, and
 * readable event type labels.
 * Keys must start with a lowercase ASCII letter and contain only letters/digits.
 * Acronyms are preserved: loadHTTPError becomes "Load HTTP Error".
 * Supports props(), emptyProps(), and payload creator functions, like NgRx.
 * Creator parameters require explicit types, including parameters with default values.
 *
 * @param source - String literal identifying the event source.
 * @param events - Event definitions keyed by camelCase string literals.
 * @returns Event creators with the original keys and `[Source] Event Label` types.
 * @throws If an event key does not start with a lowercase ASCII letter or
 * contains characters other than ASCII letters and digits.
 *
 * @example
 * ```ts
 * import { emptyProps, props } from '@ngrx/store';
 * import { events } from '@ngrx-sugar/store';
 *
 * const booksPageEvents = events('Books Page', {
 *   entered: emptyProps(),
 *   bookSelected: props<{ id: string }>(),
 *   queryChanged: (query: string) => ({ query: query.trim() }),
 * });
 *
 * booksPageEvents.entered();
 * // { type: '[Books Page] Entered' }
 *
 * booksPageEvents.bookSelected({ id: '42' });
 * // { type: '[Books Page] Book Selected', id: '42' }
 *
 * booksPageEvents.queryChanged(' Angular ');
 * // { type: '[Books Page] Query Changed', query: 'Angular' }
 *
 * booksPageEvents.bookSelected.type;
 * // '[Books Page] Book Selected'
 * ```
 */
export function events<
  const Source extends string,
  Events extends Record<string, EventConfig>,
>(
  source: Source & StringLiteralCheck<Source, "source">,
  events: EventGroupConfig<Events>,
): EventGroup<Source, Events> {
  const entries = Object.entries(events);

  return Object.fromEntries(
    entries.map(([eventKey, eventConfig]) => [
      eventKey,
      createEvent(source, eventKey, eventConfig),
    ]),
  ) as EventGroup<Source, Events>;
}

function createEvent(
  source: string,
  eventKey: string,
  eventConfig: EventConfig,
) {
  validateEventKey(eventKey);
  const type = `[${source}] ${toEventLabel(eventKey)}`;

  const creator = createAction(type, eventConfig as any) as ActionCreator<
    string,
    (...args: any[]) => Action
  >;
  return Object.assign(creator, {
    publish: (...args: any[]): void => publishEvent(creator(...args)),
  });
}

function validateEventKey(eventKey: string) {
  if (!/^[a-z][a-zA-Z0-9]*$/.test(eventKey)) {
    throw new Error(
      `Invalid event key "${eventKey}": expected camelCase ASCII letters and digits.`,
    );
  }
}

function toEventLabel(eventKey: string): string {
  // Keep this conversion in sync with Words: loginSuccess -> Login Success,
  // loadHTTPError -> Load HTTP Error, version2Ready -> Version2 Ready.
  return eventKey
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (letter) => letter.toUpperCase());
}
