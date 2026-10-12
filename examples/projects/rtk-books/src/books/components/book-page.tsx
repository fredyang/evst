import { useEffect } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
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
import { useDispatch, useSelector } from "react-redux";
import {
  booksActions,
  selectCollection,
  selectDetail,
  selectSelectedBook,
} from "../books.slice";

export function BookPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const selected = useSelector(selectSelectedBook);
  const collection = useSelector(selectCollection);
  const detail = useSelector(selectDetail);

  useEffect(() => {
    if (id) dispatch(booksActions.bookSelected(id));
  }, [dispatch, id]);

  if (detail.id !== id || detail.loading)
    return <CircularProgress aria-label="Loading book" />;
  if (detail.error) return <Navigate to="/404" replace />;
  if (!selected)
    return <Alert severity="warning">This book is unavailable.</Alert>;

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
              dispatch(
                saved
                  ? booksActions.bookRemoved(selected)
                  : booksActions.bookAdded(selected),
              )
            }
          >
            {saved ? "Remove from collection" : "Add to collection"}
          </Button>
        </CardContent>
      </Card>
    </Stack>
  );
}
