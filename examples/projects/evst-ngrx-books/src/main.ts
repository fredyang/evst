import "./polyfills";

import { bootstrapApplication } from "@angular/platform-browser";
import { appConfig } from "@example-app/app.config";

import { AppComponent } from "@example-app/core/containers";

bootstrapApplication(AppComponent, appConfig).catch((err) =>
  console.error(err),
);
