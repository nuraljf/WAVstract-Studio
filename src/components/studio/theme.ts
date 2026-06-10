import { Platform, type ViewStyle } from "react-native";

export const COLORS = {
  bg: "#050505",
  accent: "#1A62FF",
  danger: "#FF4343",
  white: "#FFFFFF",
  white80: "rgba(255,255,255,0.8)",
  white50: "rgba(255,255,255,0.5)",
  white10: "rgba(255,255,255,0.1)",
  // Liquid-glass fills (1:1 with the Figma kit)
  glassDark: "rgba(0,0,0,0.65)",
};

export const FONT = {
  geistRegular: "Geist_400Regular",
  geistMedium: "Geist_500Medium",
  geistSemibold: "Geist_600SemiBold",
  sfRegular: Platform.select({ ios: "System", android: "sans-serif", default: "System" }) as string,
  sfMedium: Platform.select({ ios: "System", android: "sans-serif-medium", default: "System" }) as string,
  sfSemibold: Platform.select({ ios: "System", android: "sans-serif-medium", default: "System" }) as string,
};

// Width of the Figma mobile frame — keeps the web preview phone-sized.
export const FRAME_W = 402;

/**
 * Liquid-glass surface — reproduced 1:1 from the Figma UI Kit (node 199:196).
 *
 *  - fill           : variant background (dark / accent / danger)
 *  - inner highlight: the kit's 3-layer inset shadow (the glassy bevel/"texture")
 *  - outer shadow   : 0 2 8 2 rgba(0,0,0,0.1)
 *  - backdrop blur  : 1.5px (web; on native it's imperceptible over the solid bg)
 *
 * RN 0.85's `boxShadow` supports `inset`, so the shadow stack is literal — not
 * an approximation. Applied directly to the button container so icons paint on top.
 */
// The inset highlight is rendered separately via <GlassEdge> (see Glass.tsx);
// the container only supplies the fill, outer shadow, and backdrop blur.
const OUTER_SHADOW = "0px 2px 8px 2px rgba(0,0,0,0.1)";

function glass(fill: string): ViewStyle {
  const base = {
    backgroundColor: fill,
    boxShadow: OUTER_SHADOW,
    ...(Platform.OS === "web" ? { backdropFilter: "blur(1.5px)" } : null),
  };
  return base as unknown as ViewStyle;
}

export const panelSurface = glass(COLORS.glassDark);
export const accentSurface = glass(COLORS.accent);
export const dangerSurface = glass(COLORS.danger);

// Legacy elevation tokens (kept for non-glass containers if needed).
export const SHADOW_SMALL = {
  shadowColor: "#000",
  shadowOpacity: 0.1,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 2 },
  elevation: 3,
};
