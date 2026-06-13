// Glass switch matching the kit — dark glass track when off, accent fill when
// on, white knob sliding across. Used for the Developer-mode row in Settings.
import React from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, useDerivedValue, withTiming } from "react-native-reanimated";
import { GlassEdge } from "./Glass";
import { COLORS, panelSurface } from "./theme";

const W = 52;
const H = 32;
const KNOB = 24;
const PAD = 4;
const TRAVEL = W - KNOB - PAD * 2;

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const p = useDerivedValue(() => withTiming(value ? 1 : 0, { duration: 180 }), [value]);
  const onStyle = useAnimatedStyle(() => ({ opacity: p.value }));
  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: p.value * TRAVEL }] }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      hitSlop={8}
      onPress={() => onChange(!value)}
      style={[styles.track, panelSurface]}
    >
      {/* accent fill fades in for the ON state */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.fill, onStyle]} />
      <Animated.View style={[styles.knob, knobStyle]} />
      <GlassEdge radius={H / 2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: W, height: H, borderRadius: H / 2, padding: PAD,
    justifyContent: "center", overflow: "hidden",
  },
  fill: { backgroundColor: COLORS.accent, borderRadius: H / 2 },
  knob: {
    width: KNOB, height: KNOB, borderRadius: KNOB / 2,
    backgroundColor: COLORS.white,
    boxShadow: "0px 1px 3px 0px rgba(0,0,0,0.3)",
  },
});
