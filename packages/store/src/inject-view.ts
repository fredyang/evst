import { inject } from "@angular/core";
import { Store, type Selector, type SelectSignalOptions } from "@ngrx/store";

/** Reads a view as a signal. Must run in an injection context. */
export function injectView<State, Result>(
  view: Selector<State, Result>,
  options?: SelectSignalOptions<Result>,
) {
  return inject<Store<State>>(Store).selectSignal(view, options);
}

export namespace injectView {
  /** Reads a view as an observable. Must run in an injection context. */
  export function observable<State, Result>(view: Selector<State, Result>) {
    return inject<Store<State>>(Store).select(view);
  }
}
