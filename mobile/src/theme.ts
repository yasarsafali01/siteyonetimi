// Web'deki frontend/src/theme.ts ile aynı renk paleti — tutarlı marka kimliği için.
export const colors = {
  primary: "#4338ca",
  primaryLight: "#818cf8",
  primaryDark: "#312e81",
  secondary: "#0891b2",
  secondaryLight: "#22d3ee",
  background: "#f6f7fb",
  surface: "#ffffff",
  textPrimary: "#1e2537",
  textSecondary: "#667085",
  success: "#15803d",
  successLight: "#dcfce7",
  warning: "#b45309",
  warningLight: "#fef3c7",
  error: "#dc2626",
  errorLight: "#fee2e2",
  info: "#0369a1",
  infoLight: "#e0f2fe",
  border: "#e7e9f0",
  divider: "#e7e9f0",
};

export const gradients = {
  primary: ["#4338ca", "#6366f1"] as const,
  brand: ["#4338ca", "#6366f1", "#22d3ee"] as const,
  secondary: ["#0891b2", "#22d3ee"] as const,
};

export const spacing = (n: number) => n * 8;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  full: 999,
};

// React Native gölge tokenleri (iOS: shadow*, Android: elevation).
export const shadow = {
  sm: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
};
