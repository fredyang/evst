import Search from "@mui/icons-material/Search";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { booksActions, selectResults, selectSearch } from "../books.slice";
import { debounce } from "../../utils/debounce";
import { BookGrid } from "./book-grid";

export function SearchPage() {
  const dispatch = useDispatch();
  const search = useSelector(selectSearch);
  const results = useSelector(selectResults);
  const [query, setQuery] = useState(search.query);
  const publishQuery = useMemo(
    () =>
      debounce((value: string) => {
        dispatch(booksActions.searchQueryChanged(value));
      }, 300),
    [dispatch],
  );

  useEffect(() => () => publishQuery.cancel(), [publishQuery]);

  function changeQuery(value: string) {
    setQuery(value);
    if (!value.trim()) {
      publishQuery.cancel();
      dispatch(booksActions.searchQueryChanged(value));
    } else publishQuery(value);
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
