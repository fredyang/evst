import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { AppLayout } from "./app/layout";
import { store } from "./store";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#315c4b" },
    secondary: { main: "#b56a43" },
    background: { default: "#f7f5ef" },
  },
  shape: { borderRadius: 12 },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Provider store={store}>
        <BrowserRouter>
          <AppLayout />
        </BrowserRouter>
      </Provider>
    </ThemeProvider>
  </StrictMode>,
);
