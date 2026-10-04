import { bundle } from "@evst/store";
import { booksState } from "./books.state";
import { booksTasks } from "./books.tasks";

export const booksBundle = bundle(booksState, booksTasks);
