import { Routes } from "@angular/router";

import { LoginPageComponent } from "@example-app/auth/containers";
import { authGuard } from "@example-app/auth/services";
import { BookEffects, CollectionEffects } from "@example-app/books/effects";
import * as fromBooks from "@example-app/books/reducers";
import { NotFoundPageComponent } from "@example-app/core/containers";
import { provideEffects } from "@ngrx/effects";
import { provideState } from "@ngrx/store";

export const routes: Routes = [
  { path: "", redirectTo: "/books", pathMatch: "full" },
  { path: "login", component: LoginPageComponent, data: { title: "Login" } },
  {
    path: "books",
    loadChildren: () =>
      import("@example-app/books/books-routing.module").then((m) => m.routes),
    canActivate: [authGuard],
    providers: [
      provideState(fromBooks.booksFeatureKey, fromBooks.reducers),
      provideEffects(BookEffects, CollectionEffects),
    ],
  },
  {
    path: "**",
    component: NotFoundPageComponent,
    data: { title: "Not found" },
  },
];
