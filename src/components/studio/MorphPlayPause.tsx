// Morphing play ⇄ pause icon (WAV-15 #3). The two glyphs crossfade with a
// scale + slight counter-rotation so the shape appears to "morph" into the next
// rather than hard-swapping. (A true vector path-interpolation could replace
// this later; this reads smooth and is robust.)
import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
} from "react-native-reanimated";
import Svg, { Path, Rect } from "react-native-svg";
import { COLORS } from "./theme";
import { SPRING } from "./motion";
import svgPaths from "./svgPaths";

export function MorphPlayPause({
  playing,
  size = 24,
  color = COLORS.white,
}: {
  playing: boolean;
  size?: number;
  color?: string;
}) {
  const p = useSharedValue(playing ? 1 : 0);

  useEffect(() => {
    p.value = withSpring(playing ? 1 : 0, SPRING.snappy);
  }, [playing, p]);

  // Crossfade + scale only (no spin) — closer to the Music-app play/pause swap.
  // The leaving glyph shrinks under the arriving one as they cross.
  const playStyle = useAnimatedStyle(() => ({
    opacity: 1 - p.value,
    transform: [{ scale: 0.7 + (1 - p.value) * 0.3 }],
  }));
  const pauseStyle = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ scale: 0.7 + p.value * 0.3 }],
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[StyleSheet.absoluteFill, playStyle]}>
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d={svgPaths.p311c1d00 as string} fill={color} fillRule="evenodd" clipRule="evenodd" />
        </Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, pauseStyle]}>
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x={6} y={5} width={4} height={14} rx={1.5} fill={color} />
          <Rect x={14} y={5} width={4} height={14} rx={1.5} fill={color} />
        </Svg>
      </Animated.View>
    </View>
  );
}
