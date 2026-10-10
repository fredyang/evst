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
        gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
        gap: 4,
      }}
    >
      {books.map((book) => (
        <Card key={book.id} sx={{ display: "flex", flexDirection: "column" }}>
          <CardContent sx={{ flexGrow: 1 }}>
            <Box
              sx={{
                display: "flex",
                gap: 2,
                justifyContent: "space-between",
                mb: 3,
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {book.title}
              </Typography>
              {book.cover && (
                <CardMedia
                  component="img"
                  image={book.cover}
                  alt=""
                  sx={{ width: 65, height: 90, objectFit: "contain" }}
                />
              )}
            </Box>
            <Typography
              sx={{
                mb: 3,
                display: "-webkit-box",
                WebkitLineClamp: 5,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {book.description}
            </Typography>
            <Typography variant="caption">Written By:</Typography>
            <Typography>{book.authors.join(", ")}</Typography>
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
