import { isBook, type Book } from "../books/model/book";
const key = "evst-react-books.collection.v2";
function load(): Book[] {
  const value: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
  if (!Array.isArray(value) || !value.every(isBook))
    throw new Error("Saved collection is invalid.");
  return value;
}
export const bookStorage = {
  load,
  add(book: Book) {
    localStorage.setItem(
      key,
      JSON.stringify([...load().filter((b) => b.id !== book.id), book]),
    );
  },
  remove(book: Book) {
    localStorage.setItem(
      key,
      JSON.stringify(load().filter((b) => b.id !== book.id)),
    );
  },
};
