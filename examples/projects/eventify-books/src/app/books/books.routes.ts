import { Routes } from "@angular/router";

import {
  CollectionPageComponent,
  FindBookPageComponent,
  ViewBookPageComponent,
} from "@example-app/books/containers";
import { bookExistsGuard } from "@example-app/books/guards";
import { booksState } from "./store/books.state";

export const booksRoutes: Routes = [
  {
    path: "",
    providers: [booksState.provide()],
    children: [
      {
        path: "find",
        component: FindBookPageComponent,
        title: "Find book",
      },
      {
        path: ":id",
        component: ViewBookPageComponent,
        canActivate: [bookExistsGuard],
        title: "Book details",
      },
      {
        path: "",
        component: CollectionPageComponent,
        title: "Collection",
      },
    ],
  },
];
