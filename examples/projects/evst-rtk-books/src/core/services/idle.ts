/** Watches browser activity and returns complete listener/timer cleanup. */
export function watchIdle(onIdle: () => void, timeout = 5 * 60 * 1000) {
  if (typeof document === "undefined") return () => {};
  const target = document;
  let timer: number;
  const reset = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(onIdle, timeout);
  };
  const events = ["click", "keydown", "mousemove", "touchstart", "scroll"];
  events.forEach((event) => target.addEventListener(event, reset));
  reset();
  return () => {
    window.clearTimeout(timer);
    events.forEach((event) => target.removeEventListener(event, reset));
  };
}
