import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CssBaseline } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import App from "./App";
import "./index.css";
import "@fontsource/abyssinica-sil";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const headingFont = {
  fontFamily: '"Abyssinica SIL", Georgia, serif',
  fontWeight: 400,
};

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#6B4428",
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#9C5B35",
    },
    background: {
      default: "#FAF8F4",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#2D2924",
      secondary: "#756F65",
    },
    divider: "#DDD6CB",
  },
  shape: {
    borderRadius: 4,
  },
  typography: {
    fontFamily: 'Roboto, "Segoe UI", Arial, sans-serif',
    h1: headingFont,
    h2: headingFont,
    h3: headingFont,
    h4: headingFont,
    h5: headingFont,
    h6: headingFont,
    button: {
      textTransform: "none",
      fontWeight: 500,
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          boxShadow: "none",
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: "4px",
          minHeight: 48,
          textTransform: "none",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: "#FFFFFF",
          borderRadius: "4px",
        },
        notchedOutline: {
          borderColor: "#DDD6CB",
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
