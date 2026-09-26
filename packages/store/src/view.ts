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
  /** Reads this view as a signal from the registered Sugar Store. */
  signal(options?: SelectSignalOptions<Result>): Signal<Result>;
  /** Reads this view as an observable from the registered Sugar Store. */
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

/** Creates a memoized NgRx selector with Sugar signal and observable readers. */
export interface ViewBuilder {
  <State extends object, S1, Result>(
    s1: Selector<State, S1>,
    projector: (s1: S1) => Result,
  ): View<State, Result, typeof projector>;
  <State extends object, S1, S2, Result>(
    s1: Selector<State, S1>,
    s2: Selector<State, S2>,
    projector: (s1: S1, s2: S2) => Result,
  ): View<State, Result, typeof projector>;
  <State extends object, S1, S2, S3, Result>(
    s1: Selector<State, S1>,
    s2: Selector<State, S2>,
    s3: Selector<State, S3>,
    projector: (s1: S1, s2: S2, s3: S3) => Result,
  ): View<State, Result, typeof projector>;
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
 * @example Combining views from two features
 * ```ts
 * import { view } from '@ngrx-sugar/store';
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
