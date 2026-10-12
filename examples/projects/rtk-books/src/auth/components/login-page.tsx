import { useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { authActions, selectAuth } from "../auth.slice";

export function LoginPage() {
  const dispatch = useDispatch();
  const auth = useSelector(selectAuth);
  const [username, setUsername] = useState("ngrx");
  const [password, setPassword] = useState("");

  if (auth.user) return <Navigate to="/books" replace />;

  return (
    <Card sx={{ maxWidth: 368, mx: "auto", mt: 6 }}>
      <CardContent>
        <Stack
          component="form"
          spacing={4}
          onSubmit={(event) => {
            event.preventDefault();
            dispatch(authActions.loginRequested({ username, password }));
          }}
        >
          <Typography variant="h5" align="center">
            Login
          </Typography>
          {auth.error && <Alert severity="error">{auth.error}</Alert>}
          <TextField
            label="Username"
            variant="filled"
            value={username}
            autoComplete="username"
            required
            disabled={auth.pending}
            onChange={(event) => setUsername(event.target.value)}
          />
          <TextField
            label="Password"
            variant="filled"
            type="password"
            autoComplete="current-password"
            value={password}
            disabled={auth.pending}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button
            type="submit"
            disabled={auth.pending}
            sx={{ alignSelf: "end" }}
          >
            {auth.pending ? "Signing in…" : "Login"}
          </Button>
          <Typography variant="caption" color="text.secondary">
            Demo login: ngrx or test, with any password.
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
