// Living ambient gradient (WAV-30) — rebuilt 1:1 from the design (Figma 277:43):
// it is literally THREE 515×515 circles stacked at the top edge, each a flat
// fill, with a single ~60px layer blur over the group. Stacking + blur is what
// produces the deep-blue top → vivid-blue body → light-blue band → fade profile
// (sampled from the comp). Never static:
//   - drift     : the circles breathe / wander on independent slow loops
//   - reactive  : while audio plays, each circle rides a band energy
//                 (bass→front, mid→middle, treble→back) via the engine analysers
// The studio mounts it `anchor="top" reactive`; onboarding keeps it always-on.
// Both use the IDENTICAL geometry — one 1:1 gradient everywhere.
import React from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming,
  Easing, cancelAnimation, type SharedValue,
} from "react-native-reanimated";
import { player, syntheticLevels } from "../../lib/audio-engine";

const web = Platform.OS === "web";

// Design geometry (Figma 277:43): 515×694 frame, three 515-diameter circles.
// The frame is 515 wide and the app frame is 402 — the glow overflows ~56px per
// side exactly like the comp, so design units map 1:1 to screen px (no scaling).
const GLOW = 515; // circle diameter
const BLUR = 60; // ~59.6 layer blur on the group

// Back → front, matching the Figma layer order (Ellipse 3 is back-most). Each
// `edge` is the circle's offset from the anchored edge, verbatim from the comp:
// Ellipse 1 top -179, Ellipse 2 -76, Ellipse 3 0.
const CIRCLES = [
  { color: "#9DBCFF", edge: 0, band: "treble" as const }, // Ellipse 3 (back, lowest) — light band
  { color: "#1A62FF", edge: 76, band: "mid" as const }, // Ellipse 2 — vivid body
  { color: "#0051FF", edge: 179, band: "bass" as const }, // Ellipse 1 (front, highest) — deep top
];

export function AmbientGradient({
  reactive = false,
  playing = false,
  anchor = "top",
  style,
}: {
  /** true = studio mode: hidden until `playing`, circles ride the audio */
  reactive?: boolean;
  playing?: boolean;
  /** which edge the glow hugs (design is top; bottom mirrors it) */
  anchor?: "bottom" | "top";
  style?: StyleProp<ViewStyle>;
}) {
  // energy pushes the circles AWAY from the anchored edge (down for top)
  const dir = anchor === "top" ? 1 : -1;

  // --- ambient drift (always running; transform-only) ---
  const drift = useSharedValue(0);
  const wander = useSharedValue(0);
  const sway = useSharedValue(0);
  React.useEffect(() => {
    drift.value = withRepeat(withTiming(1, { duration: 7000, easing: Easing.inOut(Easing.sin) }), -1, true);
    wander.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 11000, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 13000, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    sway.value = withRepeat(withTiming(1, { duration: 17000, easing: Easing.inOut(Easing.sin) }), -1, true);
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
      bass.value = Math.max((v[0] + v[1]) / 2, bass.value * 0.93);
      mid.value = Math.max((v[2] + v[3]) / 2, mid.value * 0.93);
      treble.value = Math.max((v[4] + v[5]) / 2, treble.value * 0.93);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reactive, playing, bass, mid, treble]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: reactive ? withTiming(playing ? 1 : 0, { duration: 600 }) : 1,
  }));

  // one animated style per circle — breathing drift + its band swelling/pushing
  const energyOf = (band: "bass" | "mid" | "treble") =>
    band === "bass" ? bass : band === "mid" ? mid : treble;
  const styleA = useCircleStyle(CIRCLES[0], energyOf(CIRCLES[0].band), drift, wander, sway, dir);
  const styleB = useCircleStyle(CIRCLES[1], energyOf(CIRCLES[1].band), drift, wander, sway, dir);
  const styleC = useCircleStyle(CIRCLES[2], energyOf(CIRCLES[2].band), drift, wander, sway, dir);
  const circleStyles = [styleA, styleB, styleC];

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, containerStyle, style]}>
      {/* the group layer blur (web). The whole 3-circle stack is blurred as one,
          exactly like a Figma layer-blur on the frame. */}
      <View style={web ? [styles.blurGroup, { filter: `blur(${BLUR}px)` } as ViewStyle] : styles.blurGroup}>
        {CIRCLES.map((c, i) => {
          const pos: ViewStyle = anchor === "top" ? { top: -c.edge } : { bottom: -c.edge };
          return (
            <Animated.View
              key={i}
              style={[
                styles.circle,
                { backgroundColor: c.color },
                // native has no CSS blur — soften with opacity + heavy overlap
                web ? null : { opacity: 0.55 },
                pos,
                circleStyles[i],
              ]}
            />
          );
        })}
      </View>
    </Animated.View>
  );
}

// transform: ambient breathing + the band energy pushing the circle away from
// the anchored edge and swelling it. Kept subtle so the glow stays watery.
function useCircleStyle(
  c: { band: string },
  energy: SharedValue<number>,
  drift: SharedValue<number>,
  wander: SharedValue<number>,
  sway: SharedValue<number>,
  dir: number,
) {
  return useAnimatedStyle(() => ({
    transform: [
      { translateX: (wander.value - 0.5) * 40 },
      { translateY: dir * (drift.value * 18 + energy.value * 60) },
      { scale: 1 + sway.value * 0.05 + drift.value * 0.04 + energy.value * 0.22 },
    ],
  }));
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, overflow: "hidden" },
  blurGroup: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  circle: {
    position: "absolute",
    left: "50%",
    marginLeft: -GLOW / 2, // centered horizontally; overflows the 402 frame like the comp
    width: GLOW,
    height: GLOW,
    borderRadius: GLOW / 2,
  },
});
