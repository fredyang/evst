import { createAction, type PayloadActionCreator } from "@reduxjs/toolkit";
import { publish } from "./store.js";

export type EmptyProps = { readonly kind: "empty" };
export type Props<Payload> = {
  readonly kind: "payload";
  readonly _payload?: Payload;
};

/** Declares an event without a payload. */
export function emptyProps(): EmptyProps {
  return { kind: "empty" };
}

/** Declares the payload type accepted by an event. */
export function props<Payload>(): Props<Payload> {
  return { kind: "payload" };
}

type EventConfig = EmptyProps | Props<unknown>;
type SourcedAction<
  Payload,
  Type extends string,
  Source extends string,
  Name extends string,
> = {
  type: Type;
  payload: Payload;
  readonly source: Source;
  readonly name: Name;
};
type EventCreator<
  Config extends EventConfig,
  Type extends string,
  Source extends string,
  Name extends string,
> =
  Config extends Props<infer Payload>
    ? Omit<PayloadActionCreator<Payload, Type>, "match"> & {
        (payload: Payload): SourcedAction<Payload, Type, Source, Name>;
        match(
          action: unknown,
        ): action is SourcedAction<Payload, Type, Source, Name>;
        publish(payload: Payload): void;
      }
    : Omit<PayloadActionCreator<void, Type>, "match"> & {
        (): SourcedAction<undefined, Type, Source, Name>;
        match(
          action: unknown,
        ): action is SourcedAction<undefined, Type, Source, Name>;
        publish(): void;
      };

type EventGroup<
  Source extends string,
  Definitions extends Record<string, EventConfig>,
> = {
  [Key in keyof Definitions]: EventCreator<
    Definitions[Key],
    `[${Source}] ${EventLabel<Key & string>}`,
    Source,
    EventLabel<Key & string>
  >;
};

type Words<
  Text extends string,
  Previous extends string = "",
> = Text extends `${infer First}${infer Rest}`
  ? `${First extends Uppercase<First>
      ? First extends Lowercase<First>
        ? ""
        : Previous extends Lowercase<Previous> | `${number}`
          ? " "
          : ""
      : ""}${First}${Words<Rest, First>}`
  : "";
type EventLabel<Key extends string> = Capitalize<Words<Key>>;

/**
 * Creates typed Redux Toolkit action creators grouped by the event source.
 * Created events include readonly source and name properties retaining their literal types.
 * Calling `.publish()` dispatches through the store configured by `createEvstStore()`.
 */
export function events<
  const Source extends string,
  const Definitions extends Record<string, EventConfig>,
>(source: Source, definitions: Definitions): EventGroup<Source, Definitions> {
  if (!source.trim())
    throw new Error("Invalid event source: expected a nonempty string.");

  return Object.fromEntries(
    Object.entries(definitions).map(([key, definition]) => {
      if (!/^[a-z][a-zA-Z0-9]*$/.test(key)) {
        throw new Error(
          `Invalid event key \"${key}\": expected camelCase ASCII letters and digits.`,
        );
      }
      const name = toEventLabel(key);
      const type = `[${source}] ${name}`;
      const actionCreator = createAction(type);
      const creator = Object.assign(
        (payload?: unknown) => {
          const event = { type, payload };
          return Object.defineProperties(event, {
            source: {
              value: source,
              enumerable: true,
              writable: false,
              configurable: false,
            },
            name: {
              value: name,
              enumerable: true,
              writable: false,
              configurable: false,
            },
          });
        },
        {
          type,
          toString: () => type,
          match: (action: unknown) =>
            actionCreator.match(action) &&
            "source" in action &&
            action.source === source &&
            "name" in action &&
            action.name === name,
        },
      );
      return [
        key,
        Object.assign(creator, {
          publish: (payload?: unknown) =>
            publish(definition.kind === "empty" ? creator() : creator(payload)),
        }),
      ];
    }),
  ) as EventGroup<Source, Definitions>;
}

function toEventLabel(key: string): string {
  return key
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (letter) => letter.toUpperCase());
}
