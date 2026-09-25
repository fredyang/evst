import { provideHttpClient } from "@angular/common/http";
import {
  ApplicationConfig,
  provideZonelessChangeDetection,
} from "@angular/core";
import { provideAnimations } from "@angular/platform-browser/animations";
import { provideRouter, withHashLocation } from "@angular/router";
import { provideEffects } from "@ngrx/effects";
import { provideRouterStore } from "@ngrx/router-store";
import { provideStore, provideState } from "@ngrx/store";
import { provideStoreDevtools } from "@ngrx/store-devtools";
import { routes } from "./app.routes";
import { AuthEffects } from "./auth/effects";
import { UserEffects, RouterEffects } from "./core/effects";
import { rootReducers, metaReducers } from "./reducers";
import * as fromAuth from "@example-app/auth/reducers";

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideAnimations(),
    provideHttpClient(),
    provideRouter(routes, withHashLocation()),
    provideStore(rootReducers, {
      metaReducers,
      runtimeChecks: {
        strictStateSerializability: true,
        strictActionSerializability: true,
        strictActionWithinNgZone: false,
        strictActionTypeUniqueness: true,
      },
    }),
    provideRouterStore(),
    provideStoreDevtools({ name: "NgRx Book Store App" }),
    provideEffects(UserEffects, RouterEffects, AuthEffects),
    provideState(fromAuth.authFeatureKey, fromAuth.reducers),
  ],
};
