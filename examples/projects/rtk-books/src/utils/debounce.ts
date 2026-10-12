/** Delays a callback until calls have stopped for the given interval. */
export function debounce<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delay: number,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const cancel = () => {
    clearTimeout(timer);
    timer = undefined;
  };

  const run = (...args: Args) => {
    cancel();
    timer = setTimeout(() => {
      timer = undefined;
      callback(...args);
    }, delay);
  };

  return Object.assign(run, { cancel });
}
