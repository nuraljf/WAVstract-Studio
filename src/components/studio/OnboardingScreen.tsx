// Sign-up / log-in screen, 1:1 from Figma 236:194 (plus 237:761 loading and
// 238:1328 failed states). OAuth only — Apple, Google, or continue as guest.
import React from "react";
import { View, Text, Image, StyleSheet, Platform } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { GlassEdge } from "./Glass";
import { PressableScale } from "./PressableScale";
import { AppleIcon, GoogleIcon, ChevronRightIcon, ErrorTriangleIcon } from "./icons";
import { COLORS, FONT, FRAME_W, panelSurface } from "./theme";
import { LoadingBars } from "./LoadingBars";
import { useAuth } from "../../lib/use-auth";

const HERO = require("./assets/onboard-hero.png");
const GRADIENT = require("./assets/onboard-gradient.png");
const LOGO = require("./assets/wavstract-logo.png");

// White surface for the Google button (the kit glass recipe with a light fill).
const lightGlass = {
  backgroundColor: "rgba(255,255,255,0.65)",
  boxShadow: "0px 2px 8px 2px rgba(0,0,0,0.1)",
  ...(Platform.OS === "web" ? { backdropFilter: "blur(1.5px)" } : null),
} as const;

export default function OnboardingScreen() {
  const { signInWith, continueAsGuest, error, clearError } = useAuth();
  const [busy, setBusy] = React.useState(false);

  const oauth = (provider: "apple" | "google") => {
    setBusy(true);
    // On success the page redirects away — busy stays up until then.
    signInWith(provider).catch(() => setBusy(false));
  };

  if (error) {
    return (
      <Animated.View entering={FadeIn.duration(220)} style={styles.full}>
        <View style={styles.errorCenter}>
          <ErrorTriangleIcon size={88} />
          <Text style={styles.errorTitle}>ERROR</Text>
          <Text style={styles.errorBody}>Something went wrong,{"\n"}Please try again later.</Text>
          <PressableScale onPress={clearError} style={styles.retryBtn}>
            <Text style={styles.retryLabel}>Retry</Text>
            <GlassEdge radius={16} />
          </PressableScale>
        </View>
      </Animated.View>
    );
  }

  if (busy) {
    return (
      <Animated.View entering={FadeIn.duration(220)} style={styles.full}>
        <LoadingBars size={28} />
      </Animated.View>
    );
  }

  return (
    <View style={styles.full}>
      <View style={styles.frame}>
        {/* blue glow behind the lower half */}
        <Image source={GRADIENT} style={styles.gradient} resizeMode="stretch" />

        {/* logo + headline */}
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>
          <Text style={styles.titleBold}>Pure audio,{"\n"}</Text>
          <Text style={styles.titleItalic}>extracted instantly.</Text>
        </Text>

        {/* hero: app icons + timeline mock (decorative, from the design) */}
        <Image source={HERO} style={styles.hero} resizeMode="contain" />

        <Text style={styles.caption}>Sign up to sync your library across devices.</Text>

        <View style={styles.buttons}>
          <PressableScale onPress={() => oauth("apple")} style={[styles.oauthBtn, styles.appleBtn]}>
            <AppleIcon size={24} />
            <Text style={styles.appleLabel}>Continue with Apple</Text>
            <GlassEdge radius={16} />
          </PressableScale>

          <PressableScale onPress={() => oauth("google")} style={[styles.oauthBtn, styles.googleBtn]}>
            <GoogleIcon size={24} />
            <Text style={styles.googleLabel}>Continue with Google</Text>
            <GlassEdge radius={16} />
          </PressableScale>

          <PressableScale onPress={continueAsGuest} style={styles.guestBtn}>
            <Text style={styles.guestLabel}>Continue as Guest</Text>
            <ChevronRightIcon size={20} />
          </PressableScale>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center" },
  frame: { flex: 1, width: "100%", maxWidth: FRAME_W, overflow: "hidden" },

  gradient: { position: "absolute", left: 0, right: 0, bottom: 0, height: 489, width: "100%" },

  logo: { position: "absolute", left: 20, top: 56, width: 101, height: 46 },
  title: { position: "absolute", left: 20, top: 109, width: 333, lineHeight: 40 * 0.96 + 4 },
  titleBold: { fontFamily: FONT.geistSemibold, fontSize: 40, color: COLORS.white },
  titleItalic: {
    fontFamily: FONT.geistLight,
    fontStyle: "italic", // Geist ships no italics — the browser obliques it, matching the comp
    fontSize: 40,
    color: COLORS.white,
  },

  hero: { position: "absolute", alignSelf: "center", top: 178, width: 362, height: 456 },

  caption: {
    position: "absolute", left: 20, top: 548,
    fontFamily: FONT.sfRegular, fontSize: 14, color: COLORS.white80,
  },

  buttons: { position: "absolute", top: 582, alignSelf: "center", gap: 10, alignItems: "center" },
  oauthBtn: {
    width: 362, height: 56, borderRadius: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    overflow: "hidden",
  },
  appleBtn: { ...panelSurface },
  googleBtn: lightGlass as object,
  appleLabel: { fontFamily: FONT.geistMedium, fontSize: 16, color: COLORS.white, textAlign: "center" },
  googleLabel: { fontFamily: FONT.geistMedium, fontSize: 16, color: "#000", textAlign: "center" },
  guestBtn: {
    width: 362, height: 56, borderRadius: 34,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
  },
  guestLabel: { fontFamily: FONT.geistMedium, fontSize: 16, color: COLORS.white, textAlign: "center" },

  errorCenter: { alignItems: "center", gap: 10, paddingHorizontal: 40 },
  errorTitle: {
    fontFamily: FONT.geistSemibold, fontSize: 20, color: COLORS.danger,
    letterSpacing: 1, marginTop: 6, textAlign: "center",
  },
  errorBody: {
    fontFamily: FONT.geistRegular, fontSize: 16, color: COLORS.white,
    textAlign: "center", lineHeight: 22,
  },
  retryBtn: {
    marginTop: 14, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16,
    overflow: "hidden",
    ...panelSurface,
  },
  retryLabel: { fontFamily: FONT.geistMedium, fontSize: 16, color: COLORS.white, textAlign: "center" },
});
