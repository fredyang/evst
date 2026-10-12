import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { useSelector } from "react-redux";
import { selectCollection, selectCollectionBooks } from "../books.slice";
import { BookGrid } from "./book-grid";

export function CollectionPage() {
  const books = useSelector(selectCollectionBooks);
  const collection = useSelector(selectCollection);
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" align="center">
          My Collection
        </Typography>
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
