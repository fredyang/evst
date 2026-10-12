/** Delays an async operation until calls have stopped for the given interval. */
export function debounce<Args extends unknown[], Result>(
  operation: (...args: Args) => Promise<Result>,
  delay: number,
): ((...args: Args) => Promise<Result | undefined>) & { cancel(): void } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let resolvePending: ((result: Result | undefined) => void) | undefined;

  const cancel = () => {
    clearTimeout(timer);
    timer = undefined;
    resolvePending?.(undefined);
    resolvePending = undefined;
  };

  const run = (...args: Args) => {
    cancel();
    return new Promise<Result | undefined>((resolve, reject) => {
      resolvePending = resolve;
      timer = setTimeout(() => {
        timer = undefined;
        resolvePending = undefined;
        Promise.resolve()
          .then(() => operation(...args))
          .then(resolve, reject);
      }, delay);
    });
  };

  return Object.assign(run, { cancel });
}
