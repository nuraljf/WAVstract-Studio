// Apple-style page transition (WAV-47): the incoming page RESIZES in (96% →
// 100%) while a blur resolves to sharp and the opacity fades up — the visionOS
// window-open feel. Runs on a slightly slower curve than the numeric rolls
// (SPRING.smooth is 500ms; pages take 650ms).
//
// At rest the web `filter` is removed entirely — even `blur(0px)` creates a
// filter root, which would cut the page's backdrop-filter glass surfaces off
// from the gradient behind them.
import React from "react";
import { Platform, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
} from "react-native-reanimated";

const web = Platform.OS === "web";
const PAGE_SPRING = { duration: 650, dampingRatio: 1 } as const;

export function PageTransition({
  id,
  children,
  style,
}: {
  /** the transition re-runs whenever this changes (tab key / gate screen) */
  id: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const p = useSharedValue(0);
  React.useEffect(() => {
    // also plays on first mount — boot → onboarding/studio reveals the same way
    p.value = 0;
    p.value = withSpring(1, PAGE_SPRING);
  }, [id, p]);

  const anim = useAnimatedStyle(() => {
    const v = p.value;
    return {
      opacity: v,
      transform: [{ scale: 0.96 + v * 0.04 }],
      ...(web ? ({ filter: v >= 0.999 ? "none" : `blur(${(1 - v) * 14}px)` } as any) : null),
    };
  });

  return <Animated.View style={[{ flex: 1 }, anim, style]}>{children}</Animated.View>;
}
