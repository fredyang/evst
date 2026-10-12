import Search from "@mui/icons-material/Search";
import { useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { fromFindBookPage } from "../evst/books.events";
import { booksViews } from "../evst/books.state";
import { BookGrid } from "./book-grid";

export function SearchPage() {
  const search = booksViews.search.use();
  const results = booksViews.results.use();
  const [query, setQuery] = useState(search.query);

  function changeQuery(query: string) {
    setQuery(query);
    fromFindBookPage.searchQueryChanged.publish({ query });
  }

  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h5" align="center" gutterBottom>
          Browse Books
        </Typography>
        <Typography color="text.secondary">
          Search Google Books by title or author and save your favorites.
        </Typography>
      </Box>

      <TextField
        fullWidth
        label="Search by title or author"
        value={query}
        onChange={(event) => changeQuery(event.target.value)}
        slotProps={{
          input: {
            endAdornment: search.loading ? (
              <CircularProgress size={20} />
            ) : (
              <Search color="action" />
            ),
          },
        }}
      />

      {search.error && <Alert severity="error">{search.error}</Alert>}

      {!search.loading &&
        !search.error &&
        search.query.trim() &&
        !results.length && (
          <Alert severity="info">No books match that search.</Alert>
        )}

      <BookGrid books={results} />
    </Stack>
  );
}
