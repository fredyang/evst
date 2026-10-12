import { isBook, type Book } from "../books/model/book";
export function createBookStorage(
  getStorage: () => Pick<Storage, "getItem" | "setItem"> = () => localStorage,
) {
  const key = "evst-react-books.collection.v2";
  function load(): Book[] {
    const value: unknown = JSON.parse(getStorage().getItem(key) ?? "[]");
    if (!Array.isArray(value) || !value.every(isBook))
      throw new Error("Saved collection is invalid.");
    return value;
  }
  return {
    load,
    add(book: Book) {
      getStorage().setItem(
        key,
        JSON.stringify([...load().filter((b) => b.id !== book.id), book]),
      );
    },
    remove(book: Book) {
      getStorage().setItem(
        key,
        JSON.stringify(load().filter((b) => b.id !== book.id)),
      );
    },
  };
}
