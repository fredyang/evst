import { createEvstStore } from "@evst/react";
import { booksState, createBooksTasks } from "./books";

export const store = createEvstStore({
  features: [booksState],
  tasks: [createBooksTasks()],
});
