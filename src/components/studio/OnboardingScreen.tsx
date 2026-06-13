// Sign-up / log-in screen, 1:1 from the updated Figma 236:194 ("onboarding
// (updated)"): the living blue glow hugging the TOP edge, the vector wordmark,
// the headline, and two buttons — Continue with Google or continue as guest.
// (WAV-30: the glow drifts, always.) The previous hero card cluster and the
// Continue-with-Apple button were dropped to match the new design.
import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { GlassEdge } from "./Glass";
import { PressableScale } from "./PressableScale";
import { WavstractLogo } from "./WavstractLogo";
import { AmbientGradient } from "./AmbientGradient";
import { GoogleIcon, ChevronRightIcon } from "./icons";
import { COLORS, FONT, FRAME_W } from "./theme";
import { LoadingVeil, ErrorVeil } from "./LoadingBars";
import { useAuth } from "../../lib/use-auth";

// White surface for the Google button — the design's "stroke" frame
// (Figma 236:343) is a rgba(255,255,255,0.65) fill under the kit's inset glint.
const lightGlass = {
  backgroundColor: "rgba(255,255,255,0.65)",
  boxShadow: "0px 2px 8px 2px rgba(0,0,0,0.1)",
  ...(Platform.OS === "web" ? { backdropFilter: "blur(1.5px)" } : null),
} as const;

export default function OnboardingScreen() {
  const { signInWith, continueAsGuest, error, clearError } = useAuth();
  const [busy, setBusy] = React.useState(false);

  const oauth = () => {
    setBusy(true);
    // On success the page redirects away — busy stays up until then.
    signInWith("google").catch(() => setBusy(false));
  };

  return (
    <View style={styles.full}>
      <View style={styles.frame}>
        {/* the design's blue glow — hugs the TOP edge, alive at all times (WAV-30) */}
        <AmbientGradient anchor="top" />

        {/* logo + headline (Figma 236:194: logo y193/811, headline y273/811) */}
        <WavstractLogo width={101} style={styles.logo} />
        <Text style={styles.title}>
          <Text style={styles.titleBold}>Pure audio,{"\n"}</Text>
          <Text style={styles.titleItalic}>extracted instantly.</Text>
        </Text>

        {/* caption + buttons hug the bottom edge (design inset 40/811 = 4.93%) */}
        <View style={styles.bottom}>
          <Text style={styles.caption}>Sign up to sync your library across devices.</Text>

          <View style={styles.buttons}>
            <PressableScale onPress={oauth} style={[styles.oauthBtn, styles.googleBtn]}>
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

        {/* universal states (Figma 237:761 / 238:1328): the screen stays visible
            underneath a frosted veil — no black takeover */}
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

  // Vertical anchors as FRACTIONS of the 811pt Figma frame (WAV-42): exact 1:1
  // at the design height, proportional on taller/shorter phones. Updated comp:
  // logo 193/811 = 23.8%, headline 273/811 = 33.66%.
  logo: { position: "absolute", left: 20, top: "23.8%" },
  // "extracted instantly." must stay on ONE line (two lines total)
  title: { position: "absolute", left: 20, top: "33.66%", width: 362, lineHeight: 40 * 0.96 + 4 },
  titleBold: { fontFamily: FONT.geistSemibold, fontSize: 40, color: COLORS.white },
  titleItalic: {
    fontFamily: FONT.geistLight,
    fontStyle: "italic", // Geist ships no italics — the browser obliques it, matching the comp
    fontSize: 40,
    color: COLORS.white,
  },

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
  googleBtn: lightGlass as object,
  googleLabel: { fontFamily: FONT.geistMedium, fontSize: 16, color: "#000", textAlign: "center" },
  guestBtn: {
    width: 362, height: 56, borderRadius: 34,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
  },
  guestLabel: { fontFamily: FONT.geistMedium, fontSize: 16, color: COLORS.white, textAlign: "center" },
});
