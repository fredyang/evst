import { lazy, Suspense, useEffect } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Menu from "@mui/icons-material/Menu";
import Bookmark from "@mui/icons-material/Bookmark";
import Search from "@mui/icons-material/Search";
import {
  AppBar,
  Button,
  Container,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Box,
} from "@mui/material";
import { authViews } from "../auth/evst/auth.state";
import { fromAuth } from "../auth/evst/auth.events";
import { LoginPage } from "../auth/components/login-page";
import { coreViews } from "../core/evst/core.state";
import { fromLayout, fromUser } from "../core/evst/core.events";
import { watchIdle } from "../core/services/idle";
import { NotFoundPage } from "../core/components/not-found-page";

const BooksModule = lazy(async () => {
  const module = await import("../books/books-module");
  module.provideBooks();
  return { default: module.default };
});

function ProtectedBooks() {
  const loggedIn = authViews.loggedIn.use();
  if (!loggedIn) return <Navigate to="/login" replace />;
  return (
    <Suspense fallback={<CircularProgress aria-label="Loading books" />}>
      <BooksModule />
    </Suspense>
  );
}

export function AppLayout() {
  const auth = authViews.root.use();
  const showSidenav = coreViews.showSidenav.use();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!auth.user) return;
    return watchIdle(document, () => fromUser.idleTimeoutElapsed.publish());
  }, [auth.user]);

  useEffect(() => {
    const title =
      pathname === "/login"
        ? "Login"
        : pathname === "/books/find"
          ? "Find book"
          : pathname === "/books"
            ? "Collection"
            : pathname.startsWith("/books/")
              ? "Book details"
              : "Not found";
    document.title = title + " | Book Collection";
  }, [pathname]);

  const closeMenu = () => fromLayout.sidenavClosed.publish();

  return (
    <>
      <AppBar position="sticky" elevation={0}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            aria-label="Toggle navigation"
            onClick={() =>
              showSidenav ? closeMenu() : fromLayout.sidenavOpened.publish()
            }
          >
            <Menu />
          </IconButton>
          <Typography variant="h6" sx={{ ml: 1 }}>
            Book Collection
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer open={showSidenav} onClose={closeMenu}>
        <Box component="nav" aria-label="Main navigation" sx={{ width: 316 }}>
          <List>
            {auth.user ? (
              <>
                <ListItemButton
                  component={Link}
                  to="/books"
                  onClick={closeMenu}
                  selected={pathname === "/books"}
                >
                  <ListItemIcon>
                    <Bookmark />
                  </ListItemIcon>
                  <ListItemText
                    primary="My Collection"
                    secondary="View your book collection"
                  />
                </ListItemButton>
                <ListItemButton
                  component={Link}
                  to="/books/find"
                  onClick={closeMenu}
                  selected={pathname === "/books/find"}
                >
                  <ListItemIcon>
                    <Search />
                  </ListItemIcon>
                  <ListItemText
                    primary="Browse Books"
                    secondary="Find your next book!"
                  />
                </ListItemButton>
                <ListItemButton
                  onClick={() => fromAuth.logoutConfirmation.publish()}
                >
                  <ListItemText primary="Sign Out" sx={{ pl: 7 }} />
                </ListItemButton>
              </>
            ) : (
              <ListItemButton component={Link} to="/login" onClick={closeMenu}>
                <ListItemText primary="Sign In" />
              </ListItemButton>
            )}
          </List>
        </Box>
      </Drawer>

      <Container component="main" maxWidth="lg" sx={{ py: 3 }}>
        <Routes>
          <Route path="/" element={<Navigate to="/books" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/books/*" element={<ProtectedBooks />} />
          <Route
            path="/collection"
            element={<Navigate to="/books" replace />}
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Container>

      <Dialog
        open={auth.confirmingLogout}
        onClose={() => fromAuth.logoutConfirmationDismiss.publish()}
        aria-labelledby="logout-title"
      >
        <DialogTitle id="logout-title">Sign out?</DialogTitle>
        <DialogContent>Are you sure you want to sign out?</DialogContent>
        <DialogActions>
          <Button onClick={() => fromAuth.logoutConfirmationDismiss.publish()}>
            Cancel
          </Button>
          <Button onClick={() => fromAuth.logout.publish()}>Sign Out</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
