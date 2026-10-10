/**
 * Returns results only from the most recent invocation of an async operation.
 * Older work continues, but its result or error is discarded.
 * Each wrapper owns independent request tracking.
 */
export function latest<Args extends unknown[], Result>(
  operation: (...args: Args) => Promise<Result>,
): (...args: Args) => Promise<Result | undefined> {
  let current: object;

  return async (...args) => {
    const invocation = {};
    current = invocation;

    try {
      const result = await operation(...args);
      return current === invocation ? result : undefined;
    } catch (error) {
      if (current === invocation) throw error;
      return undefined;
    }
  };
}
