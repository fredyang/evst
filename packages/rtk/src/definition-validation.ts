/** @internal Validates labels before extending an immutable definition. */
export function assertNewNames(
  existing: object,
  added: object,
  kind: string,
): void {
  for (const name of Object.keys(added)) {
    if (Object.hasOwn(existing, name)) {
      throw new Error(
        `${kind} "${name}" conflicts with an existing ${kind.toLowerCase()}.`,
      );
    }
  }
}

/** @internal An event type may have only one state handler in a feature. */
export function assertUniqueEvents(types: readonly string[]): void {
  const seen = new Set<string>();
  for (const type of types) {
    if (seen.has(type)) {
      throw new Error(
        `Event "${type}" is already handled by this EVST definition.`,
      );
    }
    seen.add(type);
  }
}
