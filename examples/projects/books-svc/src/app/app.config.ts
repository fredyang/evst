import { provideHttpClient } from "@angular/common/http";
import {
  ApplicationConfig,
  provideZonelessChangeDetection,
} from "@angular/core";
import { provideAnimations } from "@angular/platform-browser/animations";
import { provideRouter, withHashLocation } from "@angular/router";
import { routes } from "./app.routes";

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideAnimations(),
    provideHttpClient(),
    provideRouter(routes, withHashLocation()),
  ],
};
