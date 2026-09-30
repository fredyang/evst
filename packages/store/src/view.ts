import type { Signal } from "@angular/core";
import type { Observable } from "rxjs";
import {
  createSelector,
  type MemoizedSelector,
  type Selector,
  type SelectSignalOptions,
} from "@ngrx/store";
import { cachedStore } from "./provide-store-sugar.js";

/** Injection helpers attached to a memoized view. */
export type ViewMethods<Result> = {
  /**
   * Reads this view as a signal from the registered Sugar Store.
   *
   * @param options - Signal selection options, including an optional equality function.
   * @returns A signal containing the current view result.
   */
  signal(options?: SelectSignalOptions<Result>): Signal<Result>;
  /**
   * Reads this view as an observable from the registered Sugar Store.
   *
   * @returns An observable of view results.
   */
  observable(): Observable<Result>;
};

type View<State, Result, Projector> = MemoizedSelector<
  State,
  Result,
  Projector
> &
  ViewMethods<Result>;

/** Adds signal and observable access to a memoized selector. */
export function attachViewMethods<
  ViewSelector extends MemoizedSelector<object, any>,
>(
  selector: ViewSelector,
): ViewSelector & ViewMethods<ReturnType<ViewSelector>> {
  return Object.assign(selector, {
    signal: (options?: SelectSignalOptions<ReturnType<ViewSelector>>) =>
      cachedStore().selectSignal(selector, options),
    observable: () => cachedStore().select(selector),
  });
}

/**
 * Creates memoized NgRx selectors with Sugar signal and observable readers.
 *
 * `view()` supports one or more input selectors followed by a projector.
 */
export interface ViewBuilder {
  /**
   * Creates a view from one input selector.
   *
   * @param s1 - Input selector.
   * @param projector - Maps the input result to the view result.
   * @returns A memoized view with signal and observable readers.
   */
  <State extends object, S1, Result>(
    s1: Selector<State, S1>,
    projector: (s1: S1) => Result,
  ): View<State, Result, typeof projector>;
  /**
   * Creates a view from two input selectors.
   *
   * @param s1 - First input selector.
   * @param s2 - Second input selector.
   * @param projector - Maps input results to the view result.
   * @returns A memoized view with signal and observable readers.
   */
  <State extends object, S1, S2, Result>(
    s1: Selector<State, S1>,
    s2: Selector<State, S2>,
    projector: (s1: S1, s2: S2) => Result,
  ): View<State, Result, typeof projector>;
  /**
   * Creates a view from three input selectors.
   *
   * @param s1 - First input selector.
   * @param s2 - Second input selector.
   * @param s3 - Third input selector.
   * @param projector - Maps input results to the view result.
   * @returns A memoized view with signal and observable readers.
   */
  <State extends object, S1, S2, S3, Result>(
    s1: Selector<State, S1>,
    s2: Selector<State, S2>,
    s3: Selector<State, S3>,
    projector: (s1: S1, s2: S2, s3: S3) => Result,
  ): View<State, Result, typeof projector>;
  /**
   * Creates a view from four or more input selectors.
   *
   * @param args - Input selectors followed by a projector.
   * @returns A memoized view with signal and observable readers.
   */
  <State extends object, Slices extends unknown[], Result>(
    ...args: [...slices: Selector<State, unknown>[], projector: unknown] &
      [
        ...slices: { [Index in keyof Slices]: Selector<State, Slices[Index]> },
        projector: (...slices: Slices) => Result,
      ]
  ): View<State, Result, (...slices: Slices) => Result>;
}

/**
 * Creates a standalone Sugar view.
 *
 * The result is also a standard NgRx memoized selector, so it can compose
 * feature views or be used with NgRx Store APIs.
 *
 * @returns A memoized view with signal and observable readers.
 *
 * @example Combining views from two features
 * ```ts
 * import { view } from '@ngrx-eventify/store';
 * import { ordersState } from './orders.state';
 * import { usersState } from './users.state';
 *
 * export const selectedUserWithOrders = view(
 *   usersState.views.users,
 *   usersState.views.selectedId,
 *   ordersState.views.orders,
 *   (users, selectedId, orders) => {
 *     const user = users.find(user => user.id === selectedId);
 *     if (!user) return null;
 *
 *     const userOrders = orders.filter(order => order.userId === user.id);
 *     return {
 *       ...user,
 *       orders: userOrders,
 *       totalSpent: userOrders.reduce((total, order) => total + order.amount, 0),
 *     };
 *   },
 * );
 *
 * // Component field initializer:
 * // readonly selectedUser = selectedUserWithOrders.signal();
 * ```
 */
export const view: ViewBuilder = ((...args: unknown[]) =>
  attachViewMethods(createSelector(...(args as never)))) as ViewBuilder;
