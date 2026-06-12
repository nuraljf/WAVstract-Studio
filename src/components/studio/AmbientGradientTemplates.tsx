// AmbientGradientTemplates — five audio-reactive ambient gradient templates,
// same contract as AmbientGradient (WAV-30) but each with its own layer
// composition and motion character. PURE radial gradients on web (fully
// transparent around the glow — no plates, layers over any background incl.
// user photos); native falls back to translucent fills and never crashes.
// Shared behavior:
//   - drift     : every layer breathes/wanders on independent 7–17s loops
//   - anchor    : which edge the glow hugs; energy pushes AWAY from it
//   - reactive  : visible only while `playing`; layers ride the band energies
//                 (bass → base/big, mid → secondary, treble → fine/quick)
// Per-frame work is transform/opacity only (Reanimated worklets) — 60fps.
import React from "react";
import { Platform, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming,
  withDelay, Easing, cancelAnimation, interpolate, type SharedValue,
} from "react-native-reanimated";
import { player, syntheticLevels } from "../../lib/audio-engine";

const web = Platform.OS === "web";
const TAU = Math.PI * 2;

export type AmbientGradientProps = {
  /** true = studio mode: hidden until `playing`, layers ride the audio */
  reactive?: boolean;
  playing?: boolean;
  /** which edge the glow hugs (onboarding: bottom; studio: top) */
  anchor?: "bottom" | "top";
  style?: StyleProp<ViewStyle>;
};

// ---------------------------------------------------------------------------
// palette — everything anchored in #1A62FF; accents stay subordinate
// ---------------------------------------------------------------------------
const blue = (a: number) => `rgba(26,98,255,${a})`;
const deep = (a: number) => `rgba(10,46,178,${a})`; // shaded blue
const light = (a: number) => `rgba(86,150,255,${a})`; // tinted blue
const cyan = (a: number) => `rgba(64,205,255,${a})`; // accent
const violet = (a: number) => `rgba(124,92,255,${a})`; // accent
const ice = (a: number) => `rgba(196,220,255,${a})`; // near-white sparks

// ---------------------------------------------------------------------------
// paint helpers — gradients fade to full transparency around the glow
// ---------------------------------------------------------------------------
const blob = (size: number, rgba: string): ViewStyle =>
  ({
    position: "absolute",
    width: size,
    height: size,
    borderRadius: size / 2,
    ...(web
      ? { backgroundImage: `radial-gradient(circle, ${rgba} 0%, rgba(26,98,255,0) 68%)` }
      : { backgroundColor: rgba, opacity: 0.35 }),
  }) as ViewStyle;

// wide squashed ellipse (ribbon / sheen / veil) — the box aspect shapes it
const sheet = (w: number, h: number, rgba: string, fade = 70): ViewStyle =>
  ({
    position: "absolute",
    width: w,
    height: h,
    borderRadius: h / 2,
    ...(web
      ? { backgroundImage: `radial-gradient(50% 50% at 50% 50%, ${rgba} 0%, rgba(26,98,255,0) ${fade}%)` }
      : { backgroundColor: rgba, opacity: 0.3 }),
  }) as ViewStyle;

// hollow ring (transparent center) for the sonar template
const ring = (size: number, rgba: string): ViewStyle =>
  ({
    position: "absolute",
    width: size,
    height: size,
    borderRadius: size / 2,
    ...(web
      ? {
          backgroundImage: `radial-gradient(circle, rgba(26,98,255,0) 42%, ${rgba} 54%, rgba(26,98,255,0) 66%)`,
        }
      : { borderWidth: 2, borderColor: rgba }),
  }) as ViewStyle;

// the signature edge-hugging base ellipse (same geometry as AmbientGradient)
const edgeGlow = (top: boolean, height: number, peakA: number, midA: number): ViewStyle =>
  ({
    position: "absolute",
    left: -70,
    right: -70,
    height,
    ...(top ? { top: -90 } : { bottom: -90 }),
    ...(web
      ? {
          backgroundImage: `radial-gradient(72% 88% at 50% ${top ? "0%" : "100%"}, ${blue(peakA)} 0%, ${blue(midA)} 46%, ${blue(0)} 74%)`,
        }
      : { backgroundColor: blue(0.22), borderRadius: height / 2 }),
  }) as ViewStyle;

// ---------------------------------------------------------------------------
// motion helpers
// ---------------------------------------------------------------------------

/** 0↔1 ping-pong drift (optionally asymmetric up/down for organic wander) */
function usePingPong(up: number, down = up, delay = 0): SharedValue<number> {
  const t = useSharedValue(0);
  React.useEffect(() => {
    t.value = 0;
    t.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: up, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: down, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(t);
  }, [t, up, down, delay]);
  return t;
}

/** 0→1 endless loop (snap-back hidden by cyclic mappings: angles, ring fades) */
function useLoop(duration: number, delay = 0): SharedValue<number> {
  const t = useSharedValue(0);
  React.useEffect(() => {
    t.value = 0;
    t.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, false),
    );
    return () => cancelAnimation(t);
  }, [t, duration, delay]);
  return t;
}

/** band energies — attack fast, decay slow (watery, not jittery) */
function useBandEnergies(reactive: boolean, playing: boolean) {
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
  return { bass, mid, treble };
}

/** reactive contract: container fades in only while playing, else always on */
function useReactiveFade(reactive: boolean, playing: boolean) {
  return useAnimatedStyle(() => ({
    opacity: reactive ? withTiming(playing ? 1 : 0, { duration: 600 }) : 1,
  }));
}

// ---------------------------------------------------------------------------
// 1) GradientAurora — silk curtains. Three soft ribbons stacked above the
//    base glow sway sideways in counter-phase like aurora drapery.
//    bass → base-glow swell · mid → ribbon sway + lift · treble → top-ribbon shimmer
// ---------------------------------------------------------------------------
export function GradientAurora({
  reactive = false,
  playing = false,
  anchor = "bottom",
  style,
}: AmbientGradientProps) {
  const top = anchor === "top";
  const dir = top ? 1 : -1; // energy pushes AWAY from the anchored edge
  const at = (v: number | `${number}%`): ViewStyle => (top ? { top: v } : { bottom: v });
  const { bass, mid, treble } = useBandEnergies(reactive, playing);
  const fade = useReactiveFade(reactive, playing);
  const pA = usePingPong(11000);
  const pB = usePingPong(13000, 17000);
  const pC = usePingPong(8000);
  const breathe = usePingPong(15000);

  const baseStyle = useAnimatedStyle(() => ({
    opacity: 0.75 + bass.value * 0.25,
    transform: [
      { translateY: dir * (breathe.value * 18 + bass.value * 20) },
      { scaleX: 1.02 + breathe.value * 0.06 + bass.value * 0.12 },
      { scaleY: 1 + bass.value * 0.18 },
    ],
  }));
  const ribbonDeep = useAnimatedStyle(() => ({
    opacity: 0.5 + mid.value * 0.3,
    transform: [
      { translateX: (pA.value - 0.5) * 88 * (1 + mid.value * 0.5) },
      { translateY: dir * (pB.value * 16 + mid.value * 34) },
      { rotate: "-9deg" },
    ],
  }));
  const ribbonBlue = useAnimatedStyle(() => ({
    opacity: 0.42 + mid.value * 0.26,
    transform: [
      { translateX: (0.5 - pB.value) * 76 * (1 + mid.value * 0.5) },
      { translateY: dir * (pA.value * 12 + mid.value * 26) },
      { rotate: "6deg" },
    ],
  }));
  const ribbonIce = useAnimatedStyle(() => ({
    opacity: 0.15 + treble.value * 0.55,
    transform: [
      { translateX: (pC.value - 0.5) * 48 },
      { translateY: dir * (pC.value * 10 + treble.value * 20) },
      { rotate: "-4deg" },
      { scaleY: 1 + treble.value * 0.22 },
    ],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, fade, style]}>
      <Animated.View style={[edgeGlow(top, 430, 0.8, 0.28), baseStyle]} />
      <Animated.View style={[sheet(620, 240, deep(0.6)), { left: -120 }, at(-40), ribbonDeep]} />
      <Animated.View style={[sheet(560, 200, blue(0.55)), { right: -100 }, at(40), ribbonBlue]} />
      <Animated.View
        style={[sheet(480, 150, ice(0.4), 64), { left: "50%", marginLeft: -240 }, at(150), ribbonIce]}
      />
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// 2) GradientOceanCaustic — sunlight through water. Two counter-drifting
//    swell lobes overlap the pool (liquid moiré) under a cyan sheen, while
//    two small caustic glints wander and flicker.
//    bass → pool swell · mid → swell drift + lift · treble → glint flicker
// ---------------------------------------------------------------------------
export function GradientOceanCaustic({
  reactive = false,
  playing = false,
  anchor = "bottom",
  style,
}: AmbientGradientProps) {
  const top = anchor === "top";
  const dir = top ? 1 : -1;
  const at = (v: number | `${number}%`): ViewStyle => (top ? { top: v } : { bottom: v });
  const { bass, mid, treble } = useBandEnergies(reactive, playing);
  const fade = useReactiveFade(reactive, playing);
  const pSwell = usePingPong(12000);
  const pCross = usePingPong(9000, 14000);
  const pGlint = usePingPong(7000);
  const pPool = usePingPong(16000);

  const poolStyle = useAnimatedStyle(() => ({
    opacity: 0.7 + bass.value * 0.3,
    transform: [
      { translateY: dir * bass.value * 14 },
      { scaleX: 1.04 + pPool.value * 0.05 + bass.value * 0.1 },
      { scaleY: 1 + bass.value * 0.22 },
    ],
  }));
  const swellDeep = useAnimatedStyle(() => ({
    opacity: 0.45 + mid.value * 0.3,
    transform: [
      { translateX: (pSwell.value - 0.5) * 72 },
      { translateY: dir * (pCross.value * 20 + mid.value * 40) },
      { scale: 0.95 + pCross.value * 0.08 + mid.value * 0.18 },
    ],
  }));
  const swellLight = useAnimatedStyle(() => ({
    opacity: 0.4 + mid.value * 0.28,
    transform: [
      { translateX: (0.5 - pSwell.value) * 64 },
      { translateY: dir * ((1 - pCross.value) * 16 + mid.value * 32) },
      { scale: 0.9 + pSwell.value * 0.1 + mid.value * 0.15 },
    ],
  }));
  const sheenStyle = useAnimatedStyle(() => ({
    opacity: 0.18 + mid.value * 0.2 + treble.value * 0.12,
    transform: [{ translateX: (0.5 - pPool.value) * 56 }],
  }));
  const glintA = useAnimatedStyle(() => ({
    opacity: 0.08 + treble.value * 0.62,
    transform: [
      { translateX: (pGlint.value - 0.5) * 120 },
      { translateY: dir * (pSwell.value * 28 + treble.value * 14) },
      { scale: 0.75 + treble.value * 0.6 },
    ],
  }));
  const glintB = useAnimatedStyle(() => ({
    opacity: 0.06 + treble.value * 0.55,
    transform: [
      { translateX: (0.5 - pGlint.value) * 90 },
      { translateY: dir * ((1 - pCross.value) * 22 + treble.value * 18) },
      { scale: 0.7 + treble.value * 0.7 },
    ],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, fade, style]}>
      <Animated.View style={[edgeGlow(top, 460, 0.78, 0.26), poolStyle]} />
      <Animated.View style={[blob(540, deep(0.55)), { left: -140 }, at(-160), swellDeep]} />
      <Animated.View style={[blob(480, light(0.45)), { right: -120 }, at(-130), swellLight]} />
      <Animated.View
        style={[sheet(700, 170, cyan(0.3), 62), { left: "50%", marginLeft: -350 }, at(90), sheenStyle]}
      />
      <Animated.View style={[blob(120, ice(0.85)), { left: "50%", marginLeft: -150 }, at(170), glintA]} />
      <Animated.View style={[blob(84, cyan(0.8)), { left: "50%", marginLeft: 30 }, at(120), glintB]} />
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// 3) GradientTwinOrbit — twin glows (blue + violet) revolve around a shared
//    focus at the edge on a flattened orbit, joined by a rotating light
//    bridge; an ice spark counter-orbits fast above them.
//    bass → halo swell · mid → orbit radius + bridge · treble → spark
// ---------------------------------------------------------------------------
export function GradientTwinOrbit({
  reactive = false,
  playing = false,
  anchor = "bottom",
  style,
}: AmbientGradientProps) {
  const top = anchor === "top";
  const dir = top ? 1 : -1;
  const at = (v: number | `${number}%`): ViewStyle => (top ? { top: v } : { bottom: v });
  const { bass, mid, treble } = useBandEnergies(reactive, playing);
  const fade = useReactiveFade(reactive, playing);
  const orb = useLoop(15000); // one revolution per loop (eased — breathes)
  const spk = useLoop(9000);
  const breathe = usePingPong(12000);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + bass.value * 0.4,
    transform: [{ scale: 1 + breathe.value * 0.06 + bass.value * 0.22 }],
  }));
  const bridgeStyle = useAnimatedStyle(() => {
    const a = orb.value * TAU;
    // align with the true line between the orbs on the flattened ellipse
    const ang = Math.atan2(Math.sin(a) * (44 + mid.value * 18), Math.cos(a) * (120 + mid.value * 55));
    return {
      opacity: 0.15 + mid.value * 0.2,
      transform: [
        { translateY: dir * (12 + mid.value * 30) },
        { rotate: `${ang}rad` },
        { scaleX: 1 + mid.value * 0.22 },
      ],
    };
  });
  const orbAStyle = useAnimatedStyle(() => {
    const a = orb.value * TAU;
    return {
      opacity: 0.65 + mid.value * 0.25,
      transform: [
        { translateX: Math.cos(a) * (120 + mid.value * 55) },
        { translateY: Math.sin(a) * (44 + mid.value * 18) + dir * (12 + mid.value * 30) },
        { scale: 0.95 + breathe.value * 0.08 },
      ],
    };
  });
  const orbBStyle = useAnimatedStyle(() => {
    const a = orb.value * TAU;
    return {
      opacity: 0.5 + mid.value * 0.22,
      transform: [
        { translateX: -Math.cos(a) * (104 + mid.value * 48) },
        { translateY: -Math.sin(a) * (38 + mid.value * 16) + dir * (12 + mid.value * 30) },
        { scale: 0.92 + (1 - breathe.value) * 0.08 },
      ],
    };
  });
  const sparkStyle = useAnimatedStyle(() => {
    const s = -spk.value * TAU; // counter-direction, faster
    return {
      opacity: 0.1 + treble.value * 0.6,
      transform: [
        { translateX: Math.cos(s) * 168 },
        { translateY: Math.sin(s) * 60 + dir * (12 + mid.value * 30) },
        { scale: 0.75 + treble.value * 0.5 },
      ],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, fade, style]}>
      <Animated.View style={[blob(640, blue(0.45)), { left: "50%", marginLeft: -320 }, at(-290), haloStyle]} />
      <Animated.View
        style={[sheet(460, 140, light(0.3), 62), { left: "50%", marginLeft: -230 }, at(-40), bridgeStyle]}
      />
      <Animated.View style={[blob(300, blue(0.8)), { left: "50%", marginLeft: -150 }, at(-120), orbAStyle]} />
      <Animated.View style={[blob(260, violet(0.55)), { left: "50%", marginLeft: -130 }, at(-100), orbBStyle]} />
      <Animated.View style={[blob(86, ice(0.9)), { left: "50%", marginLeft: -43 }, at(-13), sparkStyle]} />
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// 4) GradientNebula — a slow-breathing cloud. The core blooms at the edge
//    under a rotating dust veil; deep and violet lobes swell outward, a cyan
//    whisper floats beyond and a star pricks through on highs.
//    bass → core bloom + veil · mid → lobe swell/drift · treble → star + whisper
// ---------------------------------------------------------------------------
export function GradientNebula({
  reactive = false,
  playing = false,
  anchor = "bottom",
  style,
}: AmbientGradientProps) {
  const top = anchor === "top";
  const dir = top ? 1 : -1;
  const at = (v: number | `${number}%`): ViewStyle => (top ? { top: v } : { bottom: v });
  const { bass, mid, treble } = useBandEnergies(reactive, playing);
  const fade = useReactiveFade(reactive, playing);
  const veil = usePingPong(17000);
  const core = usePingPong(13000);
  const lob1 = usePingPong(10000);
  const lob2 = usePingPong(11000, 15000);

  const veilStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + bass.value * 0.18,
    transform: [
      { rotate: `${(veil.value - 0.5) * 10}deg` },
      { scale: 1.02 + bass.value * 0.05 },
    ],
  }));
  const coreStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + bass.value * 0.45,
    transform: [
      { translateY: dir * bass.value * 10 },
      { scale: 0.98 + core.value * 0.05 + bass.value * 0.3 },
    ],
  }));
  const lobeDeep = useAnimatedStyle(() => ({
    opacity: 0.42 + mid.value * 0.3,
    transform: [
      { translateX: (lob1.value - 0.5) * 36 - mid.value * 24 },
      { translateY: dir * (lob1.value * 18 + mid.value * 30) },
      { scale: 0.92 + lob1.value * 0.1 + mid.value * 0.16 },
    ],
  }));
  const lobeViolet = useAnimatedStyle(() => ({
    opacity: 0.36 + mid.value * 0.26,
    transform: [
      { translateX: (0.5 - lob2.value) * 32 + mid.value * 22 },
      { translateY: dir * ((1 - lob1.value) * 14 + mid.value * 26) },
      { scale: 0.9 + lob2.value * 0.12 + mid.value * 0.14 },
    ],
  }));
  const whisperStyle = useAnimatedStyle(() => ({
    opacity: 0.16 + treble.value * 0.28,
    transform: [
      { translateX: (lob2.value - 0.5) * 40 },
      { translateY: dir * (veil.value * 22 + treble.value * 18) },
      { scale: 0.9 + treble.value * 0.2 },
    ],
  }));
  const starStyle = useAnimatedStyle(() => ({
    opacity: 0.06 + treble.value * 0.7,
    transform: [
      { translateX: (core.value - 0.5) * 18 },
      { scale: 0.7 + treble.value * 0.55 },
    ],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, fade, style]}>
      <Animated.View
        style={[sheet(760, 560, blue(0.16), 72), { left: "50%", marginLeft: -380 }, at(-200), veilStyle]}
      />
      <Animated.View style={[blob(520, blue(0.85)), { left: "50%", marginLeft: -260 }, at(-230), coreStyle]} />
      <Animated.View style={[blob(440, deep(0.6)), { left: -150 }, at(-110), lobeDeep]} />
      <Animated.View style={[blob(400, violet(0.42)), { right: -130 }, at(-90), lobeViolet]} />
      <Animated.View style={[blob(280, cyan(0.3)), { left: "50%", marginLeft: -40 }, at(190), whisperStyle]} />
      <Animated.View style={[blob(80, ice(0.95)), { left: "50%", marginLeft: -110 }, at(70), starStyle]} />
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// 5) GradientPulse — sonar heartbeat. A glow pulses at the edge and launches
//    three concentric rings that expand away and dissolve; a zenith spark
//    answers from across the screen on highs.
//    bass → heart + ring kick · mid → ring brightness · treble → zenith spark
// ---------------------------------------------------------------------------

/** shared ring animator — expansion, away-drift and fade from one loop */
function useRingStyle(
  t: SharedValue<number>,
  dir: number,
  bass: SharedValue<number>,
  mid: SharedValue<number>,
) {
  return useAnimatedStyle(() => {
    const k = t.value;
    return {
      opacity:
        interpolate(k, [0, 0.12, 0.7, 1], [0, 0.55, 0.18, 0]) * (0.55 + mid.value * 0.45),
      transform: [
        { translateY: dir * k * 90 },
        { scale: (0.35 + k * 1.6) * (1 + bass.value * 0.14) },
      ],
    };
  });
}

export function GradientPulse({
  reactive = false,
  playing = false,
  anchor = "bottom",
  style,
}: AmbientGradientProps) {
  const top = anchor === "top";
  const dir = top ? 1 : -1;
  const at = (v: number | `${number}%`): ViewStyle => (top ? { top: v } : { bottom: v });
  const { bass, mid, treble } = useBandEnergies(reactive, playing);
  const fade = useReactiveFade(reactive, playing);
  const r1 = useLoop(7000);
  const r2 = useLoop(9000, 1200);
  const r3 = useLoop(11000, 2400);
  const beat = usePingPong(8000);
  const bob = usePingPong(10000);

  const heartStyle = useAnimatedStyle(() => ({
    opacity: 0.6 + bass.value * 0.4,
    transform: [{ scale: 0.96 + beat.value * 0.07 + bass.value * 0.26 }],
  }));
  const ring1 = useRingStyle(r1, dir, bass, mid);
  const ring2 = useRingStyle(r2, dir, bass, mid);
  const ring3 = useRingStyle(r3, dir, bass, mid);
  const zenithStyle = useAnimatedStyle(() => ({
    opacity: 0.07 + treble.value * 0.55,
    transform: [
      { translateY: dir * ((bob.value - 0.5) * 24 + treble.value * 14) },
      { scale: 0.8 + treble.value * 0.45 },
    ],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, fade, style]}>
      <Animated.View style={[blob(440, blue(0.9)), { left: "50%", marginLeft: -220 }, at(-190), heartStyle]} />
      <Animated.View style={[ring(360, blue(0.5)), { left: "50%", marginLeft: -180 }, at(-150), ring1]} />
      <Animated.View style={[ring(360, light(0.45)), { left: "50%", marginLeft: -180 }, at(-150), ring2]} />
      <Animated.View style={[ring(360, blue(0.38)), { left: "50%", marginLeft: -180 }, at(-150), ring3]} />
      <Animated.View style={[blob(100, ice(0.8)), { left: "50%", marginLeft: -50 }, at("62%"), zenithStyle]} />
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// registry
// ---------------------------------------------------------------------------
export type GradientTemplateEntry = {
  key: string;
  name: string;
  Component: (props: AmbientGradientProps) => React.ReactElement;
};

export const GRADIENT_TEMPLATES: GradientTemplateEntry[] = [
  { key: "aurora", name: "Aurora", Component: GradientAurora },
  { key: "oceanCaustic", name: "Ocean Caustic", Component: GradientOceanCaustic },
  { key: "twinOrbit", name: "Twin Orbit", Component: GradientTwinOrbit },
  { key: "nebula", name: "Nebula", Component: GradientNebula },
  { key: "pulse", name: "Pulse", Component: GradientPulse },
];

const styles = StyleSheet.create({
  wrap: {
    position: "absolute", left: 0, right: 0, top: 0, bottom: 0,
    overflow: "hidden",
  },
});
