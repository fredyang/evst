import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface AuthState {
  user: { name: string } | null;
  pending: boolean;
  error: string;
  confirmingLogout: boolean;
}

const initialState: AuthState = {
  user: null,
  pending: false,
  error: "",
  confirmingLogout: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginRequested(
      state,
      _action: PayloadAction<{ username: string; password: string }>,
    ) {
      state.pending = true;
      state.error = "";
    },
    loginSucceeded(state, action: PayloadAction<{ name: string }>) {
      state.user = action.payload;
      state.pending = false;
    },
    loginFailed(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.pending = false;
    },
    logoutConfirmationRequested(state) {
      state.confirmingLogout = true;
    },
    logoutConfirmationDismissed(state) {
      state.confirmingLogout = false;
    },
    loggedOut() {
      return initialState;
    },
  },
});

export const authActions = authSlice.actions;
export const authReducer = authSlice.reducer;
export const selectAuth = (root: { auth: AuthState }) => root.auth;
export const selectLoggedIn = (root: { auth: AuthState }) =>
  Boolean(root.auth.user);
