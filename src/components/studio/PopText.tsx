// Apple-style numeric text transition (WAV-15). Replicates SwiftUI's
// `.contentTransition(.numericText())`: whenever the value changes, the old
// value rolls *out* and the new value rolls *in* from the opposite edge — the
// direction follows whether the number went up or down — with a fully-damped
// `.smooth` spring. Reads like the iOS timer / Now Playing elapsed counter
// rather than a hard text swap.
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, type StyleProp, type TextStyle } from "react-native";
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
} from "react-native-reanimated";
import { SPRING } from "./motion";

// Direction of travel from one value to the next: +1 if the number grew (new
// rises up from below, old exits up top — like an odometer), -1 if it shrank.
function numericDir(a: string, b: string): number {
  const na = parseFloat(a.replace(/[^0-9.-]/g, ""));
  const nb = parseFloat(b.replace(/[^0-9.-]/g, ""));
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return nb > na ? 1 : -1;
  return 1;
}

export function PopText({
  children,
  style,
  intensity = 1,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  intensity?: number; // 0..1 scale of the travel distance (1 = full)
}) {
  // `value` is the flattened string (used only to detect changes / direction);
  // the actual `children` nodes are what we render, so `{n}x` stays "1.0x".
  const value = React.Children.toArray(children).map(String).join("");
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const travel = ((flat.fontSize as number) ?? 16) * 0.6 * intensity;

  const prevValue = useRef(value);
  const prevChildren = useRef(children);
  const [outgoing, setOutgoing] = useState<React.ReactNode>(null);
  const dir = useSharedValue(1);
  const p = useSharedValue(1); // 0 = mid-transition, 1 = settled

  useEffect(() => {
    if (prevValue.current === value) return;
    dir.value = numericDir(prevValue.current, value);
    setOutgoing(prevChildren.current);
    prevValue.current = value;
    prevChildren.current = children;
    p.value = 0;
    p.value = withSpring(1, SPRING.smooth);
  }, [value, children, dir, p]);

  // New value: rises in from `dir` side, fades + scales up to rest.
  const incoming = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [
      { translateY: (1 - p.value) * dir.value * travel },
      { scale: 0.9 + p.value * 0.1 },
    ],
  }));
  // Old value: continues past in the same direction, fades + scales down.
  const leaving = useAnimatedStyle(() => ({
    opacity: 1 - p.value,
    transform: [
      { translateY: -p.value * dir.value * travel },
      { scale: 1 - p.value * 0.1 },
    ],
  }));

  return (
    <Animated.View style={styles.wrap}>
      <Animated.Text style={[style, incoming]}>{children}</Animated.Text>
      {outgoing != null && (
        <Animated.Text
          style={[style, styles.overlay, { textAlign: flat.textAlign }, leaving]}
          pointerEvents="none"
        >
          {outgoing}
        </Animated.Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // sizes to the incoming value; the outgoing copy overlays it absolutely so
  // the two never push layout around as they cross.
  wrap: { position: "relative", flexDirection: "row" },
  overlay: { position: "absolute", left: 0, right: 0, top: 0 },
});
