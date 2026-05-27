import { createTheme } from "@mui/material/styles";

/**
 * Application theme. Kept minimal — a dark, slightly-restrained palette
 * appropriate for a quant tool. Customization isolated here so the rest
 * of the app uses theme tokens, not hardcoded colors.
 */
export const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#0e0f12",
      paper: "#161821",
    },
    primary: { main: "#7c9eff" },
    success: { main: "#4caf50" },
    error: { main: "#ef5350" },
  },
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 8 },
});
