import { Routes } from "@angular/router";
import {
  CollectionPageComponent,
  FindBookPageComponent,
  ViewBookPageComponent,
} from "@example-app/books/containers";
import { bookExistsGuard } from "@example-app/books/guards";

export const routes: Routes = [
  {
    path: "find",
    component: FindBookPageComponent,
    data: { title: "Find book" },
  },
  {
    path: ":id",
    component: ViewBookPageComponent,
    canActivate: [bookExistsGuard],
    data: { title: "Book details" },
  },
  {
    path: "",
    component: CollectionPageComponent,
    data: { title: "Collection" },
  },
];
