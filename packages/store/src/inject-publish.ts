import { inject } from "@angular/core";
import { Store } from "@ngrx/store";
import type { Event } from "./event.js";

/** Captures the current store and returns a publisher usable outside injection context. */
export function injectPublish(): (event: Event) => void {
  const store = inject(Store);
  return (event) => store.dispatch(event);
}
