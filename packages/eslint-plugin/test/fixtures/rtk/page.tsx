import { useEffect } from "react";
import { booksViews, fromBooksPage, fromSelectionPage } from "./books";

export function BooksPage() {
  const total = booksViews.total.use();
  useEffect(() => fromBooksPage.entered.publish(), []);
  return <p>{total}</p>;
}

export function SelectionPage({ saved }: { saved: boolean }) {
  return (
    <button
      onClick={() =>
        (fromSelectionPage.checked
          ? saved
            ? fromSelectionPage.removed
            : fromSelectionPage.added
          : fromSelectionPage.added
        ).publish()
      }
    >
      Toggle selection
    </button>
  );
}
