import { useEffect } from "react";
import { booksViews, fromBooksPage } from "./books";

export function BooksPage() {
  const total = booksViews.total.use();
  useEffect(() => fromBooksPage.entered.publish(), []);
  return <p>{total}</p>;
}
