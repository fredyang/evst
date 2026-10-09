import { createSelector, type Selector } from "@reduxjs/toolkit";
import { useSelector } from "react-redux";

export type View<RootState, Result> = Selector<RootState, Result> & {
  /** Reads this view using React Redux's current Provider. */
  use(): Result;
};

/** Creates a memoized view with a React hook reader. */
export function view<RootState, Result>(
  selector: Selector<RootState, Result>,
): View<RootState, Result>;
export function view<RootState, A, Result>(
  first: Selector<RootState, A>,
  projector: (first: A) => Result,
): View<RootState, Result>;
export function view<RootState, A, B, Result>(
  first: Selector<RootState, A>,
  second: Selector<RootState, B>,
  projector: (first: A, second: B) => Result,
): View<RootState, Result>;
export function view(...args: any[]): View<any, any> {
  const selector =
    args.length === 1 ? args[0] : (createSelector as any)(...args);
  return Object.assign(selector, { use: () => useSelector(selector) });
}
