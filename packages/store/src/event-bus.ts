import { inject } from "@angular/core";
import {
  Store,
  type Action,
  type Selector,
  type SelectSignalOptions,
} from "@ngrx/store";

export type Event = Action;

/** Captures the current injector's store; returned methods can run later. */
export function injectEventBus<State = object>() {
  const store = inject<Store<State>>(Store);
  return {
    /**
     * Returns a signal of the provided selector.
     *
     * @param selector selector function
     * @param options select signal options
     * @returns Signal of the state selected by the provided selector
     * @usageNotes
     */
    signal<Result>(
      selector: Selector<State, Result>,
      options?: SelectSignalOptions<Result>,
    ) {
      return store.selectSignal(selector, options);
    },

    /**
     * Returns an observable of the provided selector.
     *
     * @param selector selector function
     * @returns Observable of the state selected by the provided selector
     */
    observable<Result>(selector: Selector<State, Result>) {
      return store.select(selector);
    },

    /**
     * Publishes the provided event to the store.
     *
     * @param event
     */
    publish(event: Event): void {
      store.dispatch(event);
    },
  };
}
