// Sign-up / log-in screen, 1:1 from Figma 236:194 (plus 237:761 loading and
// 238:1328 failed states). OAuth only — Apple, Google, or continue as guest.
// WAV-29: every piece of the hero is a REAL component (liquid glass, vector
// logo, 4x brand marks) — no screenshots. WAV-30: the glow drifts, always.
import React from "react";
import { View, Text, Image, StyleSheet, Platform } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { GlassEdge } from "./Glass";
import { PressableScale } from "./PressableScale";
import { WavstractLogo } from "./WavstractLogo";
import { AmbientGradient } from "./AmbientGradient";
import {
  AppleIcon, GoogleIcon, ChevronRightIcon,
  PlayTriangle, DownloadIcon,
} from "./icons";
import { COLORS, FONT, FRAME_W, panelSurface } from "./theme";
import { LoadingVeil, ErrorVeil } from "./LoadingBars";
import { useAuth } from "../../lib/use-auth";

const LOGO_YT = require("./assets/logo-youtube.png");
const LOGO_IG = require("./assets/logo-instagram.png");
const LOGO_TT = require("./assets/logo-tiktok.png");

// White surface for the Google button (the kit glass recipe with a light fill).
const lightGlass = {
  backgroundColor: "rgba(255,255,255,0.65)",
  boxShadow: "0px 2px 8px 2px rgba(0,0,0,0.1)",
  ...(Platform.OS === "web" ? { backdropFilter: "blur(1.5px)" } : null),
} as const;

// The demo waveform inside the hero card — bar heights verbatim from the
// design's 90 vectors (Figma 236:217), drawn at x = 5 + i·3.489 in a 322×70 box.
const HERO_WAVE = [
  3, 4, 5, 8.5, 5.5, 12, 11.5, 14.5, 10, 19.5, 14, 21, 33, 24.5, 24, 25, 19.5, 22.5, 34.5, 26.5,
  24, 33, 28.5, 28.5, 18.5, 19.5, 22.5, 25, 32, 21, 26.5, 18, 28.5, 14, 27, 20, 13.5, 11, 13.5, 15.5,
  9.5, 8, 15.5, 12.5, 7, 7, 7, 8.5, 9, 5.5, 7.5, 6.5, 6.5, 12.5, 7.5, 9, 8.5, 7, 11, 11,
  9, 11.5, 13, 15.5, 13, 13, 19.5, 20, 11, 11.5, 17.5, 18, 17.5, 19, 12, 10.5, 10, 13.5, 11, 12,
  15, 10.5, 10, 8, 11, 8.5, 7.5, 6.5, 4.5, 3,
];

// Static glass timeline mock (decorative) — same surfaces as the real Timeline.
function HeroTimelineCard() {
  return (
    <View style={styles.mockCard} pointerEvents="none">
      <View style={styles.mockWave}>
        {HERO_WAVE.map((h, i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              left: 5 + i * 3.489,
              top: 35 - h / 2,
              width: 1.5,
              height: h,
              borderRadius: 1,
              backgroundColor: COLORS.white,
            }}
          />
        ))}
        <View style={styles.mockPlayhead}>
          <Svg width={2} height={50} viewBox="0 0 2 50" fill="none">
            <Path d="M1 49V1" stroke={COLORS.accent} strokeLinecap="round" strokeWidth={2} />
          </Svg>
        </View>
      </View>

      <View style={styles.mockTicks}>
        {Array.from({ length: 7 }, (_, i) => (
          <Text key={i} style={styles.mockTick}>0:00</Text>
        ))}
      </View>

      <View style={styles.mockControls}>
        <View style={styles.mockPlay}>
          <PlayTriangle size={24} />
          <GlassEdge radius={25} />
        </View>
        <Text style={styles.mockElapsed}>
          00:00 <Text style={styles.mockTotal}>/ 00:00</Text>
        </Text>
        <View style={styles.mockSaveSlot}>
          <View style={styles.mockSave}>
            <DownloadIcon size={20} />
            <Text style={styles.mockSaveLabel}>Save WAV</Text>
            <GlassEdge radius={16} />
          </View>
        </View>
      </View>
      <GlassEdge radius={34} />
    </View>
  );
}

export default function OnboardingScreen() {
  const { signInWith, continueAsGuest, error, clearError } = useAuth();
  const [busy, setBusy] = React.useState(false);

  const oauth = (provider: "apple" | "google") => {
    setBusy(true);
    // On success the page redirects away — busy stays up until then.
    signInWith(provider).catch(() => setBusy(false));
  };

  return (
    <View style={styles.full}>
      <View style={styles.frame}>
        {/* the design's blue glow — alive at all times here (WAV-30) */}
        <AmbientGradient />

        {/* logo + headline */}
        <WavstractLogo width={101} style={styles.logo} />
        <Text style={styles.title}>
          <Text style={styles.titleBold}>Pure audio,{"\n"}</Text>
          <Text style={styles.titleItalic}>extracted instantly.</Text>
        </Text>

        {/* hero: app-icon cards + glass timeline mock — all real components */}
        <View style={styles.hero} pointerEvents="none">
          <View style={[styles.iconCardBox, styles.igBox]}>
            <View style={[styles.iconCard, styles.igCard]}>
              <Image source={LOGO_IG} style={styles.igLogo} resizeMode="contain" />
              <GlassEdge radius={34} />
            </View>
          </View>
          <View style={[styles.iconCardBox, styles.ttBox]}>
            <View style={[styles.iconCard, styles.ttCard]}>
              <Image source={LOGO_TT} style={styles.ttLogo} resizeMode="contain" />
              <GlassEdge radius={34} />
            </View>
          </View>
          <View style={styles.ytCard}>
            <Image source={LOGO_YT} style={styles.ytLogo} resizeMode="contain" />
            <GlassEdge radius={34} />
          </View>

          <HeroTimelineCard />
        </View>

        {/* caption + buttons hug the bottom edge so they never collide with
            the centered hero on different screen heights */}
        <View style={styles.bottom}>
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

        {/* universal states (Figma 237:761 / 238:1328): the screen stays
            visible underneath a frosted veil — no black takeover */}
        {busy && !error && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.stateLayer}>
            <LoadingVeil />
          </Animated.View>
        )}
        {!!error && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.stateLayer}>
            <ErrorVeil
              onRetry={() => {
                clearError();
                setBusy(false);
              }}
            />
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center" },
  frame: { flex: 1, width: "100%", maxWidth: FRAME_W, overflow: "hidden" },

  // Vertical anchors are the design positions as FRACTIONS of the 811pt Figma
  // frame (WAV-42): exact 1:1 at the design height, and the whole composition
  // keeps the comp's proportions on taller/shorter phones instead of the
  // blocks drifting apart (logo 56/811, title 109/811, hero 178/811).
  logo: { position: "absolute", left: 20, top: "6.9%" },
  // full frame width minus margins — "extracted instantly." must stay on ONE
  // line (two lines total)
  title: { position: "absolute", left: 20, top: "13.44%", width: 362, lineHeight: 40 * 0.96 + 4 },
  titleBold: { fontFamily: FONT.geistSemibold, fontSize: 40, color: COLORS.white },
  titleItalic: {
    fontFamily: FONT.geistLight,
    fontStyle: "italic", // Geist ships no italics — the browser obliques it, matching the comp
    fontSize: 40,
    color: COLORS.white,
  },

  // hero geometry verbatim from Figma 236:200 (362×456), parked at the
  // design's proportional position (top 178 on the 811 frame = 21.95%)
  hero: {
    position: "absolute", alignSelf: "center", top: "21.95%",
    width: 362, height: 456,
  },
  iconCardBox: {
    position: "absolute", width: 104.26, height: 104.26,
    alignItems: "center", justifyContent: "center",
  },
  igBox: { left: 24.87, top: 63.63 },
  ttBox: { left: 248.5, top: 48 },
  iconCard: {
    width: 90, height: 90, borderRadius: 34, overflow: "hidden",
    alignItems: "center", justifyContent: "center",
    boxShadow: "0px 2px 8px 2px rgba(0,0,0,0.1)",
  },
  igCard: { backgroundColor: COLORS.white, transform: [{ rotate: "-10deg" }] },
  ttCard: { backgroundColor: "#000000", transform: [{ rotate: "10deg" }] },
  igLogo: { width: 103.5, height: 103.5 }, // export carries soft bleed; art ≈67px
  ttLogo: { width: 58, height: 58 },
  ytCard: {
    position: "absolute", left: 131, top: 45,
    width: 100, height: 100, borderRadius: 34, overflow: "hidden",
    backgroundColor: COLORS.white,
    alignItems: "center", justifyContent: "center",
    boxShadow: "0px 2px 8px 2px rgba(0,0,0,0.1)",
  },
  ytLogo: { width: 50.4, height: 35.3 },

  // glass timeline mock (Figma 236:213 — 362×196 at y 130)
  mockCard: {
    position: "absolute", left: 0, top: 130, width: 362,
    padding: 20, borderRadius: 34, overflow: "hidden", gap: 10,
    ...panelSurface,
  },
  mockWave: { width: 322, height: 70 },
  mockPlayhead: { position: "absolute", left: 1, top: 10, width: 2, height: 50 },
  mockTicks: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  mockTick: { fontFamily: FONT.geistRegular, fontSize: 12, color: COLORS.white, textAlign: "center" },
  mockControls: { width: "100%", flexDirection: "row", alignItems: "center", gap: 10 },
  mockPlay: {
    width: 50, height: 50, borderRadius: 25,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
    backgroundColor: "rgba(26,98,255,0.8)",
    boxShadow: "0px 2px 8px 2px rgba(0,0,0,0.1)",
  },
  mockElapsed: { fontFamily: FONT.geistRegular, fontSize: 20, color: COLORS.white },
  mockTotal: { fontFamily: FONT.geistRegular, fontSize: 16, color: COLORS.white80 },
  mockSaveSlot: { flex: 1, alignItems: "flex-end" },
  mockSave: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16, overflow: "hidden",
    backgroundColor: COLORS.accent,
    boxShadow: "0px 2px 8px 2px rgba(0,0,0,0.1)",
  },
  mockSaveLabel: { fontFamily: FONT.sfSemibold, fontWeight: "600", fontSize: 12, color: COLORS.white },

  bottom: {
    // design inset 40/811 of the frame height — proportional like the rest
    position: "absolute", left: 0, right: 0, bottom: "4.93%",
    alignItems: "center", gap: 16,
  },
  caption: {
    alignSelf: "center", width: 362,
    fontFamily: FONT.sfRegular, fontSize: 14, color: COLORS.white80,
  },
  buttons: { gap: 10, alignItems: "center" },
  stateLayer: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
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
});
