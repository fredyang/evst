import { DestroyRef, inject, provideAppInitializer } from "@angular/core";
import { Store } from "@ngrx/store";
import type { Event } from "./events.js";

let registration: { store: Store; owners: number } | undefined;

/**
 * Enables event creator publishing for one active Store per loaded module.
 * Register at the application root alongside provideStore(). Different active
 * stores are rejected; concurrent SSR applications should use injectPublish().
 */
export function provideStoreSugar() {
  return provideAppInitializer(() => {
    const store = inject(Store);
    const destroyRef = inject(DestroyRef);
    if (registration && registration.store !== store) {
      throw new Error(
        "NgRx Sugar already has an active Store. Use injectPublish() for independent stores.",
      );
    }
    const current = (registration ??= { store, owners: 0 });
    current.owners++;
    destroyRef.onDestroy(() => {
      if (--current.owners === 0 && registration === current) {
        registration = undefined;
      }
    });
  });
}

/** @internal Publishes through the explicitly registered application store. */
export function publishEvent(event: Event): void {
  if (!registration) {
    throw new Error(
      "Register provideStoreSugar() before publishing NgRx Sugar events.",
    );
  }
  registration.store.dispatch(event);
}
