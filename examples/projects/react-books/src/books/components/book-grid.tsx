import { Link } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Typography,
} from "@mui/material";
import type { Book } from "../model/book";

interface BookGridProps {
  books: Book[];
}

export function BookGrid({ books }: BookGridProps) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
        gap: 3,
      }}
    >
      {books.map((book) => (
        <Card key={book.id} sx={{ display: "flex", flexDirection: "column" }}>
          {book.cover && (
            <CardMedia component="img" height="230" image={book.cover} alt="" />
          )}

          <CardContent sx={{ flexGrow: 1 }}>
            <Typography variant="h6">{book.title}</Typography>
            <Typography color="text.secondary">
              {book.authors.join(", ")}
            </Typography>
          </CardContent>

          <CardActions>
            <Button
              component={Link}
              to={`/books/${encodeURIComponent(book.id)}`}
            >
              Details
            </Button>
          </CardActions>
        </Card>
      ))}
    </Box>
  );
}
