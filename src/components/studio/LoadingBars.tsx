// WAVstract's loading language (WAV-27): the 5-bar mark from the Figma
// "bars scale" asset, animated like a live audio visualizer. Used full-screen
// while auth/library loads and inline in the table's uploading state.
import React from "react";
import { View, Text, StyleSheet, Platform, type StyleProp, type ViewStyle, type TextStyle } from "react-native";
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, withDelay,
  Easing, cancelAnimation,
} from "react-native-reanimated";

// Geometry from the Figma asset (24×24): five rounded bars of varying height.
const BAR_W = 3 / 24;
const BAR_GAP = 2 / 24;
const HEIGHTS = [7, 9, 12, 12, 12].map((h) => h / 24);

function Bar({ size, height, index }: { size: number; height: number; index: number }) {
  const pulse = useSharedValue(0);
  React.useEffect(() => {
    // mismatched timings per bar so the meter reads as music, not a metronome
    pulse.value = withDelay(
      index * 110,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 260 + index * 40, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 320 + index * 30, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      ),
    );
    return () => cancelAnimation(pulse);
  }, [pulse, index]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scaleY: 0.55 + pulse.value * 0.9 }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: size * BAR_W,
          height: size * height,
          borderRadius: (size * BAR_W) / 2,
          backgroundColor: "#FFFFFF",
          // vertical white50→white gradient per the design (web; native keeps solid)
          ...(Platform.OS === "web"
            ? ({ backgroundImage: "linear-gradient(to bottom, rgba(255,255,255,0.5), #FFFFFF)" } as object)
            : null),
        },
        style,
      ]}
    />
  );
}

export function LoadingBars({ size = 24, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ width: size, height: size, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: size * BAR_GAP }, style]}>
      {HEIGHTS.map((h, i) => (
        <Bar key={i} size={size} height={h} index={i} />
      ))}
    </View>
  );
}

/** Text with the design's white→white50 gradient fill, sweeping continuously
 *  to show work in progress (the "Uploading" label, Figma 244:3632). */
export function ShimmerText({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const shift = useSharedValue(0);
  React.useEffect(() => {
    shift.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(shift);
  }, [shift]);

  const sweep = useAnimatedStyle(() =>
    Platform.OS === "web" ? ({ backgroundPositionX: `${-shift.value * 200}%` } as any) : {},
  );

  if (Platform.OS !== "web") {
    return <Text style={[style, { color: "rgba(255,255,255,0.75)" }]}>{children}</Text>;
  }
  return (
    <Animated.Text
      style={[
        style,
        {
          backgroundImage:
            "linear-gradient(90deg, #FFFFFF 0%, rgba(255,255,255,0.45) 40%, #FFFFFF 80%)",
          backgroundSize: "200% 100%",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        } as any,
        sweep,
      ]}
    >
      {children}
    </Animated.Text>
  );
}

/** Full-screen boot/loading takeover (Figma 237:761) — black, bars centered. */
export function LoadingScreen() {
  return (
    <View style={styles.full}>
      <LoadingBars size={28} />
    </View>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: "#050505", alignItems: "center", justifyContent: "center" },
});
