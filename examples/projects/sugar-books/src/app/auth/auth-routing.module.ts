import { Routes } from "@angular/router";
import { LoginPageComponent } from "@example-app/auth/containers";

export const routes: Routes = [
  { path: "login", component: LoginPageComponent, data: { title: "Login" } },
];
