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
type EventCreator<Config extends EventConfig, Type extends string> =
  Config extends Props<infer Payload>
    ? PayloadActionCreator<Payload, Type> & { publish(payload: Payload): void }
    : PayloadActionCreator<void, Type> & { publish(): void };

type EventGroup<
  Source extends string,
  Definitions extends Record<string, EventConfig>,
> = {
  [Key in keyof Definitions]: EventCreator<
    Definitions[Key],
    `[${Source}] ${EventLabel<Key & string>}`
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
 * Created events preserve the standard RTK type and payload shape.
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
      const actionCreator = createAction<unknown, typeof type>(type);
      const creator = actionCreator;
      return [
        key,
        Object.assign(creator, {
          publish: (payload?: unknown) =>
            publish(
              definition.kind === "empty"
                ? creator(undefined)
                : creator(payload),
            ),
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
