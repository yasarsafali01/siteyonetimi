import { createTheme } from "@mui/material/styles";

// Yumuşak, katmanlı gölgeler — düz "border only" görünüm yerine hafif derinlik.
const shadowSm = "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)";
const shadowMd = "0 2px 4px rgba(15, 23, 42, 0.04), 0 8px 20px rgba(15, 23, 42, 0.07)";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#4338ca", light: "#818cf8", dark: "#312e81", contrastText: "#ffffff" },
    secondary: { main: "#0891b2", light: "#22d3ee", dark: "#0e7490", contrastText: "#ffffff" },
    background: { default: "#f6f7fb", paper: "#ffffff" },
    text: { primary: "#1e2537", secondary: "#667085" },
    success: { main: "#15803d", light: "#dcfce7" },
    warning: { main: "#b45309", light: "#fef3c7" },
    error: { main: "#dc2626", light: "#fee2e2" },
    info: { main: "#0369a1", light: "#e0f2fe" },
    divider: "#e7e9f0",
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    h4: { fontWeight: 800, letterSpacing: "-0.02em" },
    h5: { fontWeight: 700, letterSpacing: "-0.01em" },
    h6: { fontWeight: 700, letterSpacing: "-0.01em" },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 10, paddingTop: 8, paddingBottom: 8 },
        contained: {
          boxShadow: shadowSm,
          "&:hover": { boxShadow: shadowMd },
        },
        outlined: { borderWidth: 1.5, "&:hover": { borderWidth: 1.5 } },
      },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: "none" } },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid #e7e9f0",
          boxShadow: shadowSm,
          transition: "box-shadow 0.15s ease, transform 0.15s ease",
        },
      },
    },
    MuiCardActionArea: {
      styleOverrides: {
        root: {
          "&:hover": { boxShadow: shadowMd },
          transition: "box-shadow 0.15s ease",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: "none",
          borderBottom: "1px solid #e7e9f0",
          backdropFilter: "saturate(180%) blur(6px)",
          backgroundColor: "rgba(255,255,255,0.85)",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 700, color: "#475569", backgroundColor: "#f8fafc" },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:hover": { backgroundColor: "rgba(67, 56, 202, 0.04)" },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 999 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 16, boxShadow: shadowMd },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { backgroundImage: "none", borderRight: "1px solid #e7e9f0" },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          marginLeft: 8,
          marginRight: 8,
          width: "auto",
          transition: "background-color 0.15s ease",
        },
      },
    },
    MuiTextField: {
      defaultProps: { size: "small" },
    },
  },
});
