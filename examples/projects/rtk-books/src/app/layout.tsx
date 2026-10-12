import { lazy, Suspense, useEffect } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Menu from "@mui/icons-material/Menu";
import Bookmark from "@mui/icons-material/Bookmark";
import Search from "@mui/icons-material/Search";
import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { LoginPage } from "../auth/components/login-page";
import { authActions, selectAuth, selectLoggedIn } from "../auth/auth.slice";
import {
  coreActions,
  selectShowSidenav,
  idleTimeoutElapsed,
} from "../core/core.slice";
import { watchIdle } from "../core/services/idle";
import { NotFoundPage } from "../core/components/not-found-page";

const BooksModule = lazy(async () => {
  const module = await import("../books/books-module");
  module.provideBooks();
  return { default: module.default };
});

function ProtectedBooks() {
  const loggedIn = useSelector(selectLoggedIn);
  if (!loggedIn) return <Navigate to="/login" replace />;
  return (
    <Suspense fallback={<CircularProgress aria-label="Loading books" />}>
      <BooksModule />
    </Suspense>
  );
}

export function AppLayout() {
  const dispatch = useDispatch();
  const auth = useSelector(selectAuth);
  const showSidenav = useSelector(selectShowSidenav);
  const { pathname } = useLocation();

  useEffect(() => {
    if (!auth.user) return;
    return watchIdle(document, () => dispatch(idleTimeoutElapsed()));
  }, [auth.user, dispatch]);

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

  const closeMenu = () => dispatch(coreActions.sidenavClosed());

  return (
    <>
      <AppBar position="sticky" elevation={0}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            aria-label="Toggle navigation"
            onClick={() =>
              dispatch(
                showSidenav
                  ? coreActions.sidenavClosed()
                  : coreActions.sidenavOpened(),
              )
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
                  onClick={() =>
                    dispatch(authActions.logoutConfirmationRequested())
                  }
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
        onClose={() => dispatch(authActions.logoutConfirmationDismissed())}
        aria-labelledby="logout-title"
      >
        <DialogTitle id="logout-title">Sign out?</DialogTitle>
        <DialogContent>Are you sure you want to sign out?</DialogContent>
        <DialogActions>
          <Button
            onClick={() => dispatch(authActions.logoutConfirmationDismissed())}
          >
            Cancel
          </Button>
          <Button onClick={() => dispatch(authActions.loggedOut())}>
            Sign Out
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
