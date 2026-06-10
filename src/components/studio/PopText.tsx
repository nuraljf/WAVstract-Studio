// Apple-style numeric text transition (WAV-15 / WAV-23). Replicates SwiftUI's
// `.contentTransition(.numericText())` — PER CHARACTER: when the value
// changes, only the characters that actually differ roll (old glyph out, new
// glyph in from the opposite edge), while the rest of the string stays put.
// So 0:00 → 0:01 moves just the final "1", and 0:19 → 0:20 rolls only the
// last two digits — like the iOS timer / Now Playing elapsed counter.
// Direction follows whether the overall number went up or down.
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

// One character cell. Rolls only when ITS character changes; an unchanged
// cell renders completely static (no animation, no overlay).
function RollChar({
  char,
  dir,
  travel,
  style,
}: {
  char: string;
  dir: number;
  travel: number;
  style?: StyleProp<TextStyle>;
}) {
  const prevChar = useRef(char);
  const [outgoing, setOutgoing] = useState<string | null>(null);
  const d = useSharedValue(1);
  const p = useSharedValue(1); // 0 = mid-transition, 1 = settled

  useEffect(() => {
    if (prevChar.current === char) return;
    d.value = dir;
    setOutgoing(prevChar.current);
    prevChar.current = char;
    p.value = 0;
    p.value = withSpring(1, SPRING.smooth);
  }, [char, dir, d, p]);

  // New glyph: rises in from `dir` side, fades + scales up to rest.
  const incoming = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [
      { translateY: (1 - p.value) * d.value * travel },
      { scale: 0.9 + p.value * 0.1 },
    ],
  }));
  // Old glyph: continues past in the same direction, fades + scales down.
  const leaving = useAnimatedStyle(() => ({
    opacity: 1 - p.value,
    transform: [
      { translateY: -p.value * d.value * travel },
      { scale: 1 - p.value * 0.1 },
    ],
  }));

  return (
    <Animated.View style={styles.cell}>
      <Animated.Text style={[style, styles.char, incoming]}>{char}</Animated.Text>
      {outgoing != null && (
        <Animated.Text
          style={[style, styles.char, styles.overlay, leaving]}
          pointerEvents="none"
        >
          {outgoing}
        </Animated.Text>
      )}
    </Animated.View>
  );
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
  const value = React.Children.toArray(children).map(String).join("");
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const travel = ((flat.fontSize as number) ?? 16) * 0.6 * intensity;

  // Direction is decided once per value change (whole-number comparison) and
  // shared by every rolling cell so they all travel the same way.
  const prevValue = useRef(value);
  const dirRef = useRef(1);
  if (prevValue.current !== value) {
    dirRef.current = numericDir(prevValue.current, value);
    prevValue.current = value;
  }

  // Cells are matched by index; if the string length changes (rare — e.g.
  // 9:59 → 10:00) the keys shift and every cell remounts, which reads as a
  // clean swap instead of a mismatched roll.
  const chars = value.split("");
  return (
    <Animated.View style={styles.wrap}>
      {chars.map((c, i) => (
        <RollChar
          key={`${chars.length}:${i}`}
          char={c}
          dir={dirRef.current}
          travel={travel}
          style={style}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "relative", flexDirection: "row" },
  // each cell sizes to its incoming glyph; the outgoing copy overlays it
  // absolutely so the two never push layout around as they cross.
  cell: { position: "relative" },
  char: { textAlign: "center" },
  overlay: { position: "absolute", left: 0, right: 0, top: 0 },
});
