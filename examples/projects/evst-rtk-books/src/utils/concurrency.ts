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

/**
 * Queues invocations so the operation runs once at a time, in arrival order.
 * Every invocation receives its own result or error.
 */
export function concat<Args extends unknown[], Result>(
  operation: (...args: Args) => Promise<Result>,
): (...args: Args) => Promise<Result> {
  let queue = Promise.resolve();

  return (...args) => {
    const result = queue.then(() => operation(...args));
    queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
}

/**
 * Runs every invocation immediately and concurrently, returning every result.
 */
export function merge<Args extends unknown[], Result>(
  operation: (...args: Args) => Promise<Result>,
): (...args: Args) => Promise<Result> {
  return (...args) => operation(...args);
}

/**
 * Runs the first invocation and ignores new invocations until it settles.
 * An ignored invocation resolves to `undefined`.
 */
export function exhaust<Args extends unknown[], Result>(
  operation: (...args: Args) => Promise<Result>,
): (...args: Args) => Promise<Result | undefined> {
  let running = false;

  return async (...args) => {
    if (running) return undefined;

    running = true;
    try {
      return await operation(...args);
    } finally {
      running = false;
    }
  };
}
