import { createAction, createSlice } from "@reduxjs/toolkit";
import { authActions } from "../auth/auth.slice";

export const idleTimeoutElapsed = createAction("core/idleTimeoutElapsed");

const coreSlice = createSlice({
  name: "core",
  initialState: { showSidenav: false },
  reducers: {
    sidenavOpened(state) {
      state.showSidenav = true;
    },
    sidenavClosed(state) {
      state.showSidenav = false;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(authActions.logoutConfirmationRequested, (state) => {
      state.showSidenav = false;
    });
    builder.addCase(authActions.loggedOut, (state) => {
      state.showSidenav = false;
    });
  },
});

export const coreActions = coreSlice.actions;
export const coreReducer = coreSlice.reducer;
export const selectShowSidenav = (root: { core: { showSidenav: boolean } }) =>
  root.core.showSidenav;
