import Search from "@mui/icons-material/Search";
import {
  Alert,
  Box,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { fromFindBookPage } from "../evst/events";
import { booksViews } from "../evst/state";
import { BookGrid } from "./book-grid";

export function SearchPage() {
  const search = booksViews.search.use();
  const results = booksViews.results.use();

  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="overline" color="primary">
          React + EVST
        </Typography>
        <Typography variant="h3" gutterBottom>
          Find a great book.
        </Typography>
        <Typography color="text.secondary">
          Search Google Books by title or author and save your favorites.
        </Typography>
      </Box>

      <TextField
        fullWidth
        label="Search by title or author"
        value={search.query}
        onChange={(event) =>
          fromFindBookPage.searchQueryChanged.publish({
            query: event.target.value,
          })
        }
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
