export interface Book {
  id: string;
  title: string;
  authors: string[];
  description: string;
  cover: string;
}

export function isBook(value: unknown): value is Book {
  if (!value || typeof value !== "object") return false;

  const book = value as Partial<Book>;

  return (
    typeof book.id === "string" &&
    typeof book.title === "string" &&
    typeof book.description === "string" &&
    typeof book.cover === "string" &&
    Array.isArray(book.authors) &&
    book.authors.every((author) => typeof author === "string")
  );
}
