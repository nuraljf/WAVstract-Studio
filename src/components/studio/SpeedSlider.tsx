// "Playback speed & pitch" slider — drives the audio engine's playbackRate.
//   - range 0.5x – 1.5x (symmetric around 1.0x so 1.0x sits dead-center)
//   - LINEAR so each 0.1x is an evenly-spaced tick
//   - ticks are a real scale: BIG tick every 0.2x (0.6/0.8/1.0/1.2…), SMALL
//     tick every 0.1x between them (0.7/0.9/1.1…); thumb snaps to tick centers
//   - blue fill is a capsule whose rounded cap is centred on the 1.0x tick
//   - snaps to 0.1 LIVE while dragging (springs tick-to-tick)
//   - tooltip ("x.x") appears only while held, tracks the thumb, tip points up
import React, { useState } from "react";
import {
  View, Text, StyleSheet,
  type StyleProp, type ViewStyle, type LayoutChangeEvent,
} from "react-native";
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Svg, { Path, Defs, ClipPath, Rect } from "react-native-svg";
import { COLORS, FONT, SHADOW_SMALL } from "./theme";
import { SPRING as MOTION } from "./motion";
import { PopText } from "./PopText";

const MIN = 0.4;
const MAX = 1.6;                 // symmetric around 1.0 → 1.0x lands dead-center (new studio design: 13 ticks)
const ANCHOR = 1.0;             // "normal" — fill origin (cap is centred on this tick)
const STEP = 0.1;
const THUMB = 24;
const TRACK_H = 20;
const CAP = TRACK_H / 2;         // rounded-cap radius (centres the cap on a tick)
const TOOLTIP_W = 60;
const SPRING = MOTION.snappy; // tick detents + press/tooltip reveal (Apple .snappy)

// Tick scale: every 0.1 from MIN..MAX. Even tenths are BIG (every 0.2x).
const TICKS = (() => {
  const out: { value: number; big: boolean }[] = [];
  for (let t = Math.round(MIN * 10); t <= Math.round(MAX * 10); t++) {
    out.push({ value: t / 10, big: t % 2 === 0 });
  }
  return out;
})();

export type SpeedSliderProps = {
  caption?: string;
  defaultValue?: number;
  onChange?: (v: number) => void;
  style?: StyleProp<ViewStyle>;
};

export default function SpeedSlider({
  caption = "Playback speed & pitch",
  defaultValue = ANCHOR,
  onChange,
  style,
}: SpeedSliderProps) {
  const trackW = useSharedValue(0);
  const value = useSharedValue(defaultValue);
  const pressed = useSharedValue(0);
  const lastShown = useSharedValue(Math.round(defaultValue * 10));

  const [display, setDisplay] = useState(defaultValue.toFixed(1));
  const [trackWidth, setTrackWidth] = useState(0); // JS copy for static tick layout

  const setLabel = (tenths: number) => {
    setDisplay((tenths / 10).toFixed(1));
    onChange?.(tenths / 10);
  };

  const onTrackLayout = (e: LayoutChangeEvent) => {
    trackW.value = e.nativeEvent.layout.width;
    setTrackWidth(e.nativeEvent.layout.width);
  };

  // thumb-center x for a value (linear). Thumb travels THUMB/2 … w-THUMB/2.
  const centerFor = (v: number) => {
    "worklet";
    const usable = Math.max(trackW.value - THUMB, 1);
    return ((v - MIN) / (MAX - MIN)) * usable + THUMB / 2;
  };

  // Set the value from an absolute pointer x. Snaps to a 0.1 detent LIVE while
  // dragging (WAV-18) so the thumb springs tick-to-tick onto each tick centre.
  const setFromX = (x: number) => {
    "worklet";
    const usable = Math.max(trackW.value - THUMB, 1);
    let tl = x - THUMB / 2;
    if (tl < 0) tl = 0;
    if (tl > usable) tl = usable;
    const raw = MIN + (tl / usable) * (MAX - MIN);
    let snapped = Math.round(raw / STEP) * STEP;
    if (snapped < MIN) snapped = MIN;
    if (snapped > MAX) snapped = MAX;
    const tenths = Math.round(snapped * 10);
    if (tenths !== lastShown.value) {
      lastShown.value = tenths;
      value.value = withSpring(snapped, SPRING); // detent click to the new tick
      runOnJS(setLabel)(tenths);
    }
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      pressed.value = withSpring(1, SPRING);
      setFromX(e.x);
    })
    .onUpdate((e) => {
      setFromX(e.x);
    })
    .onFinalize(() => {
      pressed.value = withSpring(0, SPRING); // value is already snapped live
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: centerFor(value.value) - THUMB / 2 }],
  }));

  // Capsule fill: caps centred on the 1.0x tick and the thumb tick, so the
  // 1.0x tick is "surrounded" by the rounded start (WAV-18).
  const fillStyle = useAnimatedStyle(() => {
    const a = centerFor(ANCHOR);
    const b = centerFor(value.value);
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return { left: lo - CAP, width: hi - lo + CAP * 2 };
  });

  // Dropdown-style reveal: drops down from the thumb and scales up as it appears.
  const tooltipStyle = useAnimatedStyle(() => {
    const tc = centerFor(value.value);
    return {
      opacity: pressed.value,
      transform: [
        { translateX: tc - TOOLTIP_W / 2 },
        { translateY: (1 - pressed.value) * -10 },
        { scale: 0.8 + pressed.value * 0.2 },
      ],
    };
  });

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.header}>
        <PopText style={styles.speed} intensity={0.6}>{display}x</PopText>
        <Text style={styles.caption}>{caption}</Text>
      </View>

      <GestureDetector gesture={pan}>
        <View style={styles.track} onLayout={onTrackLayout}>
          {/* active fill (capsule) */}
          <Animated.View style={[styles.fill, fillStyle]} />

          {/* knob — original design: accent ring with the white core, so the
              track's blue never halos around a bare white circle */}
          <Animated.View style={[styles.knobWrap, thumbStyle]}>
            <View style={styles.knobOuter}><View style={styles.knobInner} /></View>
          </Animated.View>

          {/* Ticks render ON TOP of fill + thumb, at exact 0.1 value positions. */}
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {trackWidth > 0 && TICKS.map(({ value: v, big }) => {
              const usable = Math.max(trackWidth - THUMB, 1);
              const cx = ((v - MIN) / (MAX - MIN)) * usable + THUMB / 2;
              const size = big ? 4 : 2;
              return (
                <View
                  key={v}
                  style={{
                    position: "absolute",
                    left: cx - size / 2,
                    top: TRACK_H / 2 - size / 2,
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: COLORS.white,
                  }}
                />
              );
            })}
          </View>
        </View>
      </GestureDetector>

      {/* tooltip lane (below the track) */}
      <View style={styles.tooltipLane}>
        <Animated.View style={[styles.tooltip, tooltipStyle]}>
          {/* Rounded tip (Figma node 199:179, clipped to 21×7) — not a sharp triangle. */}
          <Svg width={21} height={7} viewBox="0 0 21 7" fill="none">
            <Defs>
              <ClipPath id="tipclip"><Rect width={21} height={7} /></ClipPath>
            </Defs>
            <Path
              clipPath="url(#tipclip)"
              d="M7.35401 2.54676C9.18846 1.06172 11.8115 1.06172 13.646 2.54675L16.1994 4.61377C18.6714 6.61493 18.6714 10.3851 16.1994 12.3862L13.646 14.4532C11.8115 15.9383 9.18846 15.9383 7.35401 14.4532L4.80063 12.3862C2.32862 10.3851 2.32862 6.61493 4.80063 4.61378L7.35401 2.54676Z"
              fill={COLORS.white}
            />
          </Svg>
          <View style={styles.bubble}>
            <PopText style={styles.tooltipText} intensity={0.7}>{display}x</PopText>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", gap: 10, alignItems: "center" },
  header: { alignItems: "center" },
  speed: { fontFamily: FONT.geistSemibold, fontSize: 20, color: COLORS.white, textAlign: "center" },
  caption: { fontFamily: FONT.geistRegular, fontSize: 12, color: COLORS.white80, textAlign: "center" },

  track: {
    width: "100%",
    height: TRACK_H,
    borderRadius: 99,
    backgroundColor: COLORS.white10,
    justifyContent: "center",
  },
  fill: {
    position: "absolute",
    top: 0,
    height: TRACK_H,
    borderRadius: 99,
    backgroundColor: COLORS.accent,
  },
  knobWrap: {
    position: "absolute",
    left: 0,
    top: (TRACK_H - THUMB) / 2,
    width: THUMB,
    height: THUMB,
    alignItems: "center",
    justifyContent: "center",
  },
  knobOuter: {
    width: THUMB, height: THUMB, borderRadius: THUMB / 2,
    alignItems: "center", justifyContent: "center",
    backgroundColor: COLORS.accent,
  },
  knobInner: { width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.white },

  tooltipLane: { width: "100%", height: 40 },
  tooltip: { position: "absolute", top: 0, left: 0, width: TOOLTIP_W, alignItems: "center" },
  bubble: {
    marginTop: -1,
    backgroundColor: COLORS.white,
    paddingHorizontal: 10, // Figma node 199:176
    paddingVertical: 5,
    borderRadius: 10,
    ...SHADOW_SMALL,
  },
  tooltipText: { fontFamily: FONT.geistMedium, fontSize: 12, color: "#000", textAlign: "center" },
});
