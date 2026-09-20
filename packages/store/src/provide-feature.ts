import {
  makeEnvironmentProviders,
  type EnvironmentProviders,
} from "@angular/core";
import { provideEffects } from "@ngrx/effects";
import { provideState, type Action, type ActionReducer } from "@ngrx/store";

/** Registers feature state and its effects in the current environment injector.
 * Requires provideStore() at the application root.
 */
export function provideFeature<State, Event extends Action = Action>(
  feature: { name: string; reducer: ActionReducer<State, Event> },
  ...effects: Parameters<typeof provideEffects>
): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideState(feature),
    provideEffects(...effects),
  ]);
}
