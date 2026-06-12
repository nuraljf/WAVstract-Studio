// Living ambient gradient (WAV-30) — the design's blue glow rebuilt as PURE
// radial gradients (fully transparent around the glow — no baked black fill,
// so it layers over any background, incl. the dev-mode image). Never static:
//   - drift     : every layer breathes/wanders on independent loops
//   - reactive  : while audio plays, the layers ride the actual band energies
//                 (bass→base glow, mid/treble→blobs) via the engine analysers
// The studio mounts it `anchor="top" reactive` — visible ONLY while the
// timeline's sound plays; onboarding keeps the bottom anchor, always on.
import React from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming,
  Easing, cancelAnimation,
} from "react-native-reanimated";
import { player, syntheticLevels } from "../../lib/audio-engine";

const web = Platform.OS === "web";

// `fade` stretches the falloff stops — the gradient's soft edge IS its "layer
// blur", so 1.25 reads as a 25% larger blur radius without a CSS filter (a
// real filter would re-rasterize these per-frame-scaled layers, WAV-41).
const blob = (size: number, rgba: string, fade = 1): ViewStyle =>
  ({
    position: "absolute",
    width: size,
    height: size,
    borderRadius: size / 2,
    ...(web
      ? { backgroundImage: `radial-gradient(circle, ${rgba} 0%, rgba(26,98,255,0) ${Math.min(68 * fade, 98)}%)` }
      : { backgroundColor: rgba, opacity: 0.35 }),
  }) as ViewStyle;

// the main glow — a soft ellipse hugging the anchored edge, transparent
// everywhere else (no black plate behind it)
const glowLayer = (anchor: "top" | "bottom", k: number, fade: number): ViewStyle =>
  ({
    position: "absolute",
    left: -70 * k,
    right: -70 * k,
    height: 440 * k,
    ...(anchor === "top" ? { top: -90 * k } : { bottom: -90 * k }),
    ...(web
      ? {
          backgroundImage: `radial-gradient(72% 88% at 50% ${anchor === "top" ? "0%" : "100%"}, rgba(26,98,255,0.85) 0%, rgba(26,98,255,0.30) ${46 * fade}%, rgba(26,98,255,0) ${Math.min(74 * fade, 98)}%)`,
        }
      : { backgroundColor: "rgba(26,98,255,0.22)", borderRadius: (440 * k) / 2 }),
  }) as ViewStyle;

export function AmbientGradient({
  reactive = false,
  playing = false,
  anchor = "bottom",
  style,
}: {
  /** true = studio mode: hidden until `playing`, layers ride the audio */
  reactive?: boolean;
  playing?: boolean;
  /** which edge the glow hugs (onboarding: bottom; studio: top) */
  anchor?: "bottom" | "top";
  style?: StyleProp<ViewStyle>;
}) {
  // energy pushes the layers AWAY from the anchored edge
  const dir = anchor === "top" ? 1 : -1;

  // WAV-41: the studio's reactive glow runs 50% bigger (sizes, offsets AND
  // motion amplitudes, so the character scales with it) with a 25% longer
  // falloff. The onboarding glow keeps the design geometry untouched.
  const K = reactive ? 1.5 : 1;
  const FADE = reactive ? 1.25 : 1;

  // --- ambient drift (always running; transform-only). Roomy enough to be
  // clearly alive, slow enough to stay out of the way. ---
  const drift = useSharedValue(0);
  const wander = useSharedValue(0);
  const sway = useSharedValue(0);
  React.useEffect(() => {
    drift.value = withRepeat(
      withTiming(1, { duration: 7000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    wander.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 11000, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 13000, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    sway.value = withRepeat(
      withTiming(1, { duration: 17000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(drift);
      cancelAnimation(wander);
      cancelAnimation(sway);
    };
  }, [drift, wander, sway]);

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
    opacity: reactive ? withTiming(playing ? 1 : 0, { duration: 600 }) : 1,
  }));

  // base glow: breathing + swelling with the bass
  const baseStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: dir * (drift.value * 26 + bass.value * 22) * K },
      { translateX: (wander.value - 0.5) * 44 * K },
      { scaleX: 1.02 + drift.value * 0.07 + bass.value * 0.14 },
      { scaleY: 1.0 + sway.value * 0.08 + bass.value * 0.2 },
    ],
  }));

  // left blob: mids — pushes out and grows on melody
  const blobAStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: ((0.5 - wander.value) * 90 - 20) * K },
      { translateY: dir * (drift.value * 34 + mid.value * 52) * K },
      { scale: 0.85 + sway.value * 0.18 + mid.value * 0.45 },
    ],
  }));

  // right blob: treble — quick shimmer
  const blobBStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: ((wander.value - 0.5) * 80 + 20) * K },
      { translateY: dir * ((1 - drift.value) * 30 + treble.value * 44) * K },
      { scale: 0.8 + (1 - drift.value) * 0.2 + treble.value * 0.5 },
    ],
  }));

  const aEdge = anchor === "top" ? { top: 40 * K } : { bottom: 60 * K };
  const bEdge = anchor === "top" ? { top: -30 * K } : { bottom: -20 * K };

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, containerStyle, style]}>
      <Animated.View style={[glowLayer(anchor, K, FADE), baseStyle]} />
      <Animated.View
        style={[blob(360 * K, "rgba(26,98,255,0.5)", FADE), { left: -60 * K }, aEdge, blobAStyle]}
      />
      <Animated.View
        style={[blob(300 * K, "rgba(86,150,255,0.42)", FADE), { right: -50 * K }, bEdge, blobBStyle]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute", left: 0, right: 0, top: 0, bottom: 0,
    overflow: "hidden",
  },
});
