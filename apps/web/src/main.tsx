import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CssBaseline } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#6B4428",
      contrastText: "#FFF9EC",
    },
    secondary: {
      main: "#9C5B35",
    },
    background: {
      default: "#E9D6B5",
      paper: "#FFF9EC",
    },
    text: {
      primary: "#2D2118",
      secondary: "#654F3C",
    },
    divider: "#D4BC96",
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: 'Roboto, "Segoe UI", Arial, sans-serif',
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(107, 68, 40, 0.025) 0px, rgba(107, 68, 40, 0.025) 1px, transparent 1px, transparent 9px)",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          border: "1px solid #D4BC96",
          boxShadow: "0 12px 32px rgba(74, 48, 27, 0.12)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 700,
          borderRadius: 10,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: "#FFFCF5",
          borderRadius: 10,
        },
        notchedOutline: {
          borderColor: "#CBB58F",
        },
      },
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
