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
import { provideEvst } from "@evst/store";
import { rootBundle } from "./app.bundle";
import { routes } from "./app.routes";
import { AppTitleStrategy } from "./core/app-title.strategy";

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideAnimations(),
    provideHttpClient(),
    provideRouter(routes, withHashLocation()),
    provideEvst({
      runtimeChecks: {
        strictStateSerializability: true,
        strictActionSerializability: true,
        strictActionWithinNgZone: false,
        strictActionTypeUniqueness: true,
      },
      devtools: { name: "NgRx Book Store App" },
    }),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
    rootBundle.provide(),
  ],
};
