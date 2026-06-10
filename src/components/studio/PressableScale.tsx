// Reusable animated button (WAV-15 groundwork). Drop-in replacement for
// Pressable that adds an Apple / transitions.dev-style spring: a subtle
// scale-down + dim on press, and an optional hover lift on web — so we never
// have to wire an animation into each button by hand.
//
//   <PressableScale onPress={…} style={styles.btn}>…</PressableScale>
//
// Tunables: `scaleTo` (pressed scale), `hoverTo` (web hover scale), `dim`
// (pressed opacity drop). Forwards all other Pressable props.
import React from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence,
} from "react-native-reanimated";
import { SPRING, PRESS_HOLD_MS } from "./motion";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PressableScaleProps = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number; // scale while pressed (default 0.95)
  hoverTo?: number; // scale while hovered on web (default 1 = no lift)
  dim?: number;     // opacity drop while pressed (default 0.1)
};

export function PressableScale({
  children,
  style,
  scaleTo = 0.95,
  hoverTo = 1,
  dim = 0.1,
  onPressIn,
  onPressOut,
  onHoverIn,
  onHoverOut,
  ...rest
}: PressableScaleProps) {
  const pressed = useSharedValue(0);
  const hovered = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    const hover = 1 + hovered.value * (hoverTo - 1);
    const scale = hover * (1 - pressed.value * (1 - scaleTo));
    return { transform: [{ scale }], opacity: 1 - pressed.value * dim };
  });

  return (
    <AnimatedPressable
      {...rest}
      style={[style, animatedStyle]}
      onPressIn={(e) => { pressed.value = withSpring(1, SPRING.press); onPressIn?.(e); }}
      onPressOut={(e) => {
        // ensure the dip is seen on a fast tap, then spring back
        pressed.value = withSequence(withTiming(1, { duration: PRESS_HOLD_MS }), withSpring(0, SPRING.snappy));
        onPressOut?.(e);
      }}
      onHoverIn={(e) => { hovered.value = withSpring(1, SPRING.snappy); onHoverIn?.(e); }}
      onHoverOut={(e) => { hovered.value = withSpring(0, SPRING.snappy); onHoverOut?.(e); }}
    >
      {children}
    </AnimatedPressable>
  );
}
