import { provideHttpClient } from "@angular/common/http";
import {
  ApplicationConfig,
  provideZonelessChangeDetection,
} from "@angular/core";
import { provideAnimations } from "@angular/platform-browser/animations";
import {
  provideRouter,
  TitleStrategy,
  withHashLocation,
} from "@angular/router";
import { provideStoreEventify } from "@ngrx-eventify/store";
import { routes } from "./app.routes";
import { authState } from "./auth/store/auth.state";
import { AppTitleStrategy } from "./core/app-title.strategy";
import { coreState } from "./core/store/core.state";

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideAnimations(),
    provideHttpClient(),
    provideRouter(routes, withHashLocation()),
    provideStoreEventify({
      runtimeChecks: {
        strictStateSerializability: true,
        strictActionSerializability: true,
        strictActionWithinNgZone: false,
        strictActionTypeUniqueness: true,
      },
      devtools: { name: "NgRx Book Store App" },
    }),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
    authState.provide(),
    coreState.provide(),
  ],
};
