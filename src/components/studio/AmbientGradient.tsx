// Living ambient gradient (WAV-30) — the design's blue glow (Figma 236:196)
// that is never static, ElevenLabs-style:
//   - drift     : every layer slowly breathes/wanders on independent loops
//   - reactive  : while audio plays, a meter loop drives the layers with the
//                 actual band energies (bass→base glow, mid/treble→blobs);
//                 element/video sources use the captureStream tap, or the
//                 shared synthetic groove where the browser can't tap
// The studio mounts it with `reactive` — visible ONLY while the timeline's
// sound is playing; onboarding mounts it always-on in drift mode.
import React from "react";
import { Image, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming,
  Easing, cancelAnimation,
} from "react-native-reanimated";
import { player, syntheticLevels } from "../../lib/audio-engine";

const GRADIENT = require("./assets/onboard-gradient.png");

const blob = (size: number, rgba: string): ViewStyle =>
  ({
    position: "absolute",
    width: size,
    height: size,
    borderRadius: size / 2,
    ...(Platform.OS === "web"
      ? { backgroundImage: `radial-gradient(circle, ${rgba} 0%, rgba(26,98,255,0) 68%)` }
      : { backgroundColor: rgba, opacity: 0.35 }),
  }) as ViewStyle;

export function AmbientGradient({
  reactive = false,
  playing = false,
  style,
}: {
  /** true = studio mode: hidden until `playing`, layers ride the audio */
  reactive?: boolean;
  playing?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  // --- slow ambient drift (always running; transform-only) ---
  const drift = useSharedValue(0);
  const wander = useSharedValue(0);
  React.useEffect(() => {
    drift.value = withRepeat(
      withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    wander.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 13000, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 15000, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(drift);
      cancelAnimation(wander);
    };
  }, [drift, wander]);

  // --- audio energies (attack fast, decay slow → watery, not jittery) ---
  const bass = useSharedValue(0);
  const mid = useSharedValue(0);
  const treble = useSharedValue(0);
  React.useEffect(() => {
    if (!reactive || !playing) {
      bass.value = withTiming(0, { duration: 600 });
      mid.value = withTiming(0, { duration: 600 });
      treble.value = withTiming(0, { duration: 600 });
      return;
    }
    let raf = 0;
    const tick = () => {
      const lv = player.levels(6);
      const v = lv.length && player.hasLiveLevels ? lv : syntheticLevels(6);
      const b = (v[0] + v[1]) / 2;
      const m = (v[2] + v[3]) / 2;
      const t = (v[4] + v[5]) / 2;
      bass.value = Math.max(b, bass.value * 0.93);
      mid.value = Math.max(m, mid.value * 0.93);
      treble.value = Math.max(t, treble.value * 0.93);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reactive, playing, bass, mid, treble]);

  // --- layer styles ---
  const containerStyle = useAnimatedStyle(() => ({
    opacity: reactive
      ? withTiming(playing ? 1 : 0, { duration: 600 })
      : 1,
  }));

  // base glow: the exact design gradient, breathing + swelling with the bass
  const baseStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: drift.value * 14 + bass.value * -18 },
      { translateX: (wander.value - 0.5) * 24 },
      { scale: 1.02 + drift.value * 0.05 + bass.value * 0.16 },
    ],
  }));

  // left blob: mids — rises and grows on melody
  const blobAStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: (0.5 - wander.value) * 60 - 20 },
      { translateY: drift.value * -22 + mid.value * -46 },
      { scale: 0.9 + drift.value * 0.1 + mid.value * 0.45 },
    ],
  }));

  // right blob: treble — quick shimmer
  const blobBStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: (wander.value - 0.5) * 50 + 20 },
      { translateY: drift.value * 18 + treble.value * -38 },
      { scale: 0.85 + (1 - drift.value) * 0.12 + treble.value * 0.5 },
    ],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, containerStyle, style]}>
      <Animated.View style={[styles.base, baseStyle]}>
        <Image source={GRADIENT} style={styles.baseImg} resizeMode="stretch" />
      </Animated.View>
      <Animated.View style={[blob(360, "rgba(26,98,255,0.5)"), styles.blobA, blobAStyle]} />
      <Animated.View style={[blob(300, "rgba(86,150,255,0.42)"), styles.blobB, blobBStyle]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute", left: 0, right: 0, top: 0, bottom: 0,
    overflow: "hidden",
  },
  base: { position: "absolute", left: 0, right: 0, bottom: 0, height: 489 },
  baseImg: { width: "100%", height: "100%" },
  blobA: { left: -60, bottom: 60 },
  blobB: { right: -50, bottom: -20 },
});
