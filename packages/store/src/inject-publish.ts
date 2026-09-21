import { inject } from "@angular/core";
import { Store } from "@ngrx/store";
import type { Event } from "./events.js";

/**
 * Captures the current Store and returns a function that dispatches events to it.
 * Must be called in an Angular injection context, such as a field initializer.
 * The returned function can be called later, outside the injection context.
 *
 * @returns A function that publishes an event to the captured Store.
 *
 * @example
 * ```ts
 * private readonly publish = injectPublish();
 *
 * logout() {
 *   this.publish(AuthEvents.logout());
 * }
 * ```
 */
export function injectPublish(): (event: Event) => void {
  const store = inject(Store);
  return (event) => store.dispatch(event);
}
