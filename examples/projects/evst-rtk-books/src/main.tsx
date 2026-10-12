import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { AppLayout } from "./app/layout";
import { evst } from "./evst";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#673ab7" },
    secondary: { main: "#b56a43" },
    background: { default: "#f7f7f7" },
  },
  shape: { borderRadius: 4 },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Provider store={evst}>
        <BrowserRouter>
          <AppLayout />
        </BrowserRouter>
      </Provider>
    </ThemeProvider>
  </StrictMode>,
);
