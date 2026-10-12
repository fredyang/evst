import type { AuthState } from "./auth/auth.slice";
import type { BooksState } from "./books/books.slice";

export interface AppState {
  auth: AuthState;
  core: { showSidenav: boolean };
  books?: BooksState;
}
