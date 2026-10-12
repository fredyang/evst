import { bundle } from "@evst/ngrx";
import { booksState } from "./books.state";
import { booksTasks } from "./books.tasks";

export const booksBundle = bundle(booksState, booksTasks);
