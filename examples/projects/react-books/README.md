# React Books

React Books uses Material UI and `@evst/react` for the book search and collection
flows from EVST Books.

## Running the example

From the repository root:

```sh
npm run serve:react-books
npm run build:react-books
npm run test:react-books
```

Search and direct book-detail routes call the Google Books API using the same
shared, browser-restricted API key as `evst-books`. API quota and HTTP failures
appear as errors in the interface. There is no mock-catalog fallback.

## Following state changes

- `src/books/components/` contains the search, detail, collection, and reusable
  book-grid components.
- `src/books/evst/` contains page/API `fromXxx` events, state and derived views,
  and tasks for search, detail retrieval, and collection persistence.
- `src/books/model/` contains the `Book` type and runtime validation.
- `src/services/` contains the fetch and storage boundaries. Tests inject
  replacements to exercise cancellation and errors without network access.

Search waits 300 ms and cancels earlier listeners and requests. Empty queries
clear results; stale outcomes cannot replace a newer query. Detail routes fetch
uncached books by ID. Collection changes update the UI optimistically, then
success or failure events confirm the write or roll back the change.

Full book records are saved under `evst-react-books.collection.v2` in localStorage,
so collections survive a reload without repeating searches. The earlier demo's
ID-only collection is not imported. Authentication is not included.
