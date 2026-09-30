import { Routes } from "@angular/router";

import { LoginPageComponent } from "@example-app/auth/containers";
import { authGuard } from "@example-app/auth/services";
import { NotFoundPageComponent } from "@example-app/core/containers";

export const routes: Routes = [
  {
    path: "",
    redirectTo: "/books",
    pathMatch: "full",
  },

  {
    path: "login",
    component: LoginPageComponent,
    title: "Login",
  },

  {
    path: "books",
    loadChildren: () =>
      import("@example-app/books/books.routes").then((m) => m.booksRoutes),
    canActivate: [authGuard],
  },

  {
    path: "**",
    component: NotFoundPageComponent,
    title: "Not found",
  },
];
