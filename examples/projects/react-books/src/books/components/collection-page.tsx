import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { booksViews } from "../evst/state";
import { BookGrid } from "./book-grid";

export function CollectionPage() {
  const books = booksViews.collectionBooks.use();
  const collection = booksViews.collection.use();

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="overline" color="primary">
          Saved books
        </Typography>
        <Typography variant="h3">My collection</Typography>
      </Box>

      <Divider />

      {collection.error && <Alert severity="error">{collection.error}</Alert>}

      {collection.loading ? (
        <CircularProgress />
      ) : books.length ? (
        <BookGrid books={books} />
      ) : (
        <Alert severity="info">Saved books will appear here.</Alert>
      )}
    </Stack>
  );
}
