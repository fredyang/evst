import { useEffect } from "react";
import { Alert, Button, CircularProgress, Stack } from "@mui/material";
import { Route, Routes } from "react-router-dom";
import { evst } from "../evst";
import { booksState, booksViews } from "./evst/books.state";
import { createBooksTasks } from "./evst/books.tasks";
import { fromCollectionPage } from "./evst/books.events";
import { BookPage, CollectionPage, SearchPage } from "./components";
import { NotFoundPage } from "../core/components/not-found-page";

const booksTasks = createBooksTasks();

evst.provide({ states: [booksState], tasks: [booksTasks] });

export default function BooksModule() {
  const collection = booksViews.collection.use();
  useEffect(() => fromCollectionPage.entered.publish(), []);

  if (!collection.loaded) {
    return collection.error ? (
      <Stack spacing={2}>
        <Alert severity="error">{collection.error}</Alert>
        <Button onClick={() => fromCollectionPage.entered.publish()}>
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
