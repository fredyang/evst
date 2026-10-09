import { useEffect } from "react";
import { Link, Route, Routes } from "react-router-dom";
import Bookmark from "@mui/icons-material/Bookmark";
import { AppBar, Button, Container, Toolbar, Typography } from "@mui/material";
import { fromCollectionPage } from "../books/evst/events";
import { BookPage, CollectionPage, SearchPage } from "../books/components";

export function AppLayout() {
  useEffect(() => fromCollectionPage.entered.publish(), []);

  return (
    <>
      <AppBar position="sticky" elevation={0}>
        <Toolbar>
          <Typography
            component={Link}
            to="/"
            variant="h6"
            color="inherit"
            sx={{ textDecoration: "none", flexGrow: 1 }}
          >
            EVST Book Store
          </Typography>
          <Button
            component={Link}
            to="/collection"
            color="inherit"
            startIcon={<Bookmark />}
          >
            Collection
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 5 }}>
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/books/:id" element={<BookPage />} />
          <Route path="/collection" element={<CollectionPage />} />
        </Routes>
      </Container>
    </>
  );
}
