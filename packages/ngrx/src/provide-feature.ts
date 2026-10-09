import {
  makeEnvironmentProviders,
  type EnvironmentProviders,
} from "@angular/core";
import { provideState, type Action, type ActionReducer } from "@ngrx/store";

/**
 * Registers feature state in an environment injector.
 * Supports application and route providers. Requires `provideStore()` at the
 * application root.
 *
 * @param feature - Feature name and reducer, such as a NgRx `createFeature()` result.
 * @returns Environment providers for the feature state.
 *
 * @internal
 */
export function provideFeature<
  State,
  FeatureAction extends Action = Action,
>(feature: {
  name: string;
  reducer: ActionReducer<State, FeatureAction>;
}): EnvironmentProviders {
  return makeEnvironmentProviders([provideState(feature)]);
}
