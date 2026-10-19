import { createSelector, type Selector } from "@reduxjs/toolkit";
import { useSelector } from "react-redux";
import { readView } from "./store.js";

/**
 * A read-only projection of underlying state, exposing stored or derived data.
 * A View is a data view, not a UI component or template. Components, Tasks,
 * and other application logic can consume it without changing state.
 * State changes belong in event-driven state handlers.
 */
export type View<RootState, Result> = Selector<RootState, Result> & {
  /** Reads this view using React Redux's current Provider. */
  use(): Result;
  /** Reads the current active-store value without subscribing. Requires createEvstStore(). */
  readonly snapshot: Result;
};

/**
 * Creates a read-only projection of state with a React hook and snapshot reader.
 * Views describe data access, not UI rendering, and can also be called as selectors.
 */
export function view<RootState, Result>(
  selector: Selector<RootState, Result>,
): View<RootState, Result>;
export function view<RootState, A, Result>(
  first: Selector<RootState, A>,
  projector: (first: A) => Result,
): View<RootState, Result>;
export function view<FirstRoot, SecondRoot, A, B, Result>(
  first: Selector<FirstRoot, A>,
  second: Selector<SecondRoot, B>,
  projector: (first: A, second: B) => Result,
): View<FirstRoot & SecondRoot, Result>;
export function view(...args: any[]): View<any, any> {
  const selector =
    args.length === 1 ? args[0] : (createSelector as any)(...args);
  return Object.defineProperty(
    Object.assign(selector, { use: () => useSelector(selector) }),
    "snapshot",
    {
      get: () => readView(selector),
      enumerable: true,
      configurable: true,
    },
  ) as View<any, any>;
}
