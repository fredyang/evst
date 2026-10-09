import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Add from "@mui/icons-material/Add";
import ArrowBack from "@mui/icons-material/ArrowBack";
import Delete from "@mui/icons-material/Delete";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardMedia,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { fromSelectedBookPage, fromViewBookPage } from "../evst/events";
import { booksViews } from "../evst/state";

export function BookPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const selected = booksViews.selectedBook.use();
  const collection = booksViews.collection.use();
  const detail = booksViews.detail.use();

  useEffect(() => {
    if (id) fromViewBookPage.selected.publish({ id });
  }, [id]);

  if (detail.id !== id || detail.loading) {
    return <CircularProgress aria-label="Loading book" />;
  }

  if (detail.error) {
    return <Alert severity="error">{detail.error}</Alert>;
  }

  if (!selected) {
    return <Alert severity="warning">This book is unavailable.</Alert>;
  }

  const saved = collection.ids.includes(selected.id);

  return (
    <Stack spacing={3}>
      {collection.error && <Alert severity="error">{collection.error}</Alert>}

      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate(-1)}
        sx={{ alignSelf: "start" }}
      >
        Back
      </Button>

      <Card sx={{ display: { sm: "flex" } }}>
        {selected.cover && (
          <CardMedia
            component="img"
            image={selected.cover}
            alt=""
            sx={{
              width: { sm: 300 },
              height: { xs: 280, sm: "auto" },
              objectFit: "cover",
            }}
          />
        )}

        <CardContent>
          <Typography variant="h4" gutterBottom>
            {selected.title}
          </Typography>
          <Typography color="primary" gutterBottom>
            {selected.authors.join(", ")}
          </Typography>
          <Typography component="p" sx={{ mb: 2 }}>
            {selected.description}
          </Typography>
          <Button
            variant="contained"
            disabled={
              !collection.loaded || Boolean(collection.pending[selected.id])
            }
            startIcon={saved ? <Delete /> : <Add />}
            onClick={() =>
              (saved
                ? fromSelectedBookPage.removeBook
                : fromSelectedBookPage.addBook
              ).publish({ book: selected })
            }
          >
            {saved ? "Remove from collection" : "Add to collection"}
          </Button>
        </CardContent>
      </Card>
    </Stack>
  );
}
