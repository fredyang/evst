import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { Alert, Button, CircularProgress, Stack } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { store } from "../store";
import { booksActions, booksReducer, selectCollection } from "./books.slice";
import { registerBooksListeners } from "./books.listeners";
import { BookPage } from "./components/book-page";
import { CollectionPage } from "./components/collection-page";
import { SearchPage } from "./components/search-page";
import { NotFoundPage } from "../core/components/not-found-page";

export function provideBooks() {
  store.injectFeature("books", booksReducer, () =>
    registerBooksListeners(store.listenerMiddleware),
  );
}

export default function BooksModule() {
  const dispatch = useDispatch();
  const collection = useSelector(selectCollection);
  useEffect(() => {
    dispatch(booksActions.collectionLoadStarted());
  }, [dispatch]);

  if (!collection.loaded) {
    return collection.error ? (
      <Stack spacing={2}>
        <Alert severity="error">{collection.error}</Alert>
        <Button onClick={() => dispatch(booksActions.collectionLoadStarted())}>
          Retry collection
        </Button>
      </Stack>
    ) : (
      <CircularProgress aria-label="Loading collection" />
    );
  }

  return (
    <Routes>
      <Route index element={<CollectionPage />} />
      <Route path="find" element={<SearchPage />} />
      <Route path=":id" element={<BookPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
