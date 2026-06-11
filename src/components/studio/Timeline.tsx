import React from "react";
import {
  View, Text, StyleSheet,
  type StyleProp, type ViewStyle,
} from "react-native";
import Animated, {
  useDerivedValue, useAnimatedStyle, useSharedValue,
  withDelay, withSpring, withTiming, runOnJS, type SharedValue,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Svg, { Path, G } from "react-native-svg";
import { GlassEdge } from "./Glass";
import { PressableScale } from "./PressableScale";
import { MorphPlayPause } from "./MorphPlayPause";
import { PopText } from "./PopText";
import { DownloadIcon } from "./icons";
import { COLORS, FONT, panelSurface, accentSurface } from "./theme";
import { SPRING } from "./motion";
import { fmtTime, fmtTimePad } from "../../lib/use-studio";
import svgPaths from "./svgPaths";

const WAVE_W = 323;
const WAVE_H = 70;

// svgPaths bundles the waveform bars AND every studio icon vector. Exclude the
// icon/extra keys so only the 90 waveform bars are drawn here (otherwise the
// Play/Upload/Heart/etc. glyphs render as stray shapes over the waveform).
const NON_WAVE_KEYS = new Set([
  "p311c1d00", // play
  "p23ff7580", // download
  "pf478b00", // upload
  "pa2a1700", // heart
  "p33057a80", // filter
  "p1ac285c0", // chevron-down
  "p30b66a00", // trash
  "p4ac8280", // studio
  "p174f5800", // settings
  "p15b3f530", // unused extra
  "p2018a100", // unused extra
]);

// Static design waveform — shown as the empty state before a sound is added.
function PlaceholderWave() {
  return (
    <Svg width={WAVE_W} height={WAVE_H} viewBox={`0 0 ${WAVE_W} ${WAVE_H}`} fill="none">
      <G>
        {Object.entries(svgPaths)
          .filter(([key]) => !NON_WAVE_KEYS.has(key))
          .map(([key, d]) => (
            <Path key={key} d={d as string} fill={COLORS.white10} />
          ))}
      </G>
    </Svg>
  );
}

// Construct / deconstruct (WAV-26): each bar pops up from the centerline with
// a left-to-right stagger, so a new wave "builds" instead of appearing; the
// outgoing wave collapses the same way underneath it. Custom worklets keep the
// motion in the shared spring language (same factory pattern as the list rows).
function barEntering(i: number) {
  return () => {
    "worklet";
    return {
      initialValues: { opacity: 0, transform: [{ scaleY: 0.08 }] },
      animations: {
        opacity: withDelay(i * 5, withTiming(1, { duration: 80 })),
        transform: [{ scaleY: withDelay(i * 5, withSpring(1, SPRING.bouncy)) }],
      },
    };
  };
}
function barExiting(i: number) {
  return () => {
    "worklet";
    return {
      initialValues: { opacity: 1, transform: [{ scaleY: 1 }] },
      animations: {
        opacity: withDelay(i * 2, withTiming(0, { duration: 110 })),
        transform: [{ scaleY: withDelay(i * 2, withTiming(0.08, { duration: 110 })) }],
      },
    };
  };
}

// Real waveform from decoded PCM peaks, in a single colour. Bars are plain
// absolutely-positioned views (one-shot animated, then static); progress is
// shown by overlaying an accent copy clipped to the played fraction (see
// below) — nothing here re-renders while playing (WAV-22 perf).
function PeaksWave({ peaks, color }: { peaks: number[]; color: string }) {
  const n = peaks.length;
  const slot = WAVE_W / n;
  const barW = Math.max(1.5, slot * 0.55);
  return (
    <View style={styles.waveBox} pointerEvents="none">
      {peaks.map((p, i) => {
        const h = Math.max(2, p * WAVE_H);
        return (
          <Animated.View
            key={i}
            entering={barEntering(i) as any}
            exiting={barExiting(i) as any}
            style={{
              position: "absolute",
              left: i * slot + (slot - barW) / 2,
              top: (WAVE_H - h) / 2,
              width: barW,
              height: h,
              borderRadius: barW / 2,
              backgroundColor: color,
            }}
          />
        );
      })}
    </View>
  );
}

export type TimelineProps = {
  soundId?: string | null; // identity of the shown sound — a change replays the wave build
  peaks?: number[];
  position?: number;   // seconds (React state, ~1 Hz — drives the mm:ss text)
  positionSV?: SharedValue<number>; // seconds, per-frame — drives playhead/fill
  duration?: number;   // seconds
  isPlaying?: boolean;
  onPlay?: () => void;
  onSave?: () => void;
  onSeek?: (seconds: number) => void;
  style?: StyleProp<ViewStyle>;
};

function clamp01(v: number): number {
  "worklet";
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export default function Timeline({
  soundId,
  peaks,
  position = 0,
  positionSV,
  duration = 0,
  isPlaying = false,
  onPlay,
  onSave,
  onSeek,
  style,
}: TimelineProps) {
  const hasSound = !!peaks && peaks.length > 0 && duration > 0;

  // Scrubbing (WAV-26): holding down anywhere on the wave grabs the playhead —
  // it follows the finger while held, and the audio starts from wherever it's
  // released. A plain tap is the degenerate case (grab + release in place).
  const scrubbing = useSharedValue(0);
  const scrubX = useSharedValue(0);
  const seekTo = React.useCallback(
    (f: number) => onSeek?.(f * duration),
    [onSeek, duration],
  );
  const scrub = React.useMemo(
    () =>
      Gesture.Pan()
        .enabled(hasSound && !!onSeek)
        .minDistance(0)
        .maxPointers(1)
        .onBegin((e) => {
          scrubbing.value = 1;
          scrubX.value = clamp01(e.x / WAVE_W);
        })
        .onUpdate((e) => {
          scrubX.value = clamp01(e.x / WAVE_W);
        })
        .onEnd(() => {
          // park the live head on the chosen spot BEFORE the JS seek lands, so
          // the playhead doesn't flash back to the old position for a frame
          if (positionSV) positionSV.value = scrubX.value * duration;
          runOnJS(seekTo)(scrubX.value);
        })
        .onFinalize(() => {
          scrubbing.value = 0;
        }),
    [hasSound, onSeek, duration, seekTo, scrubbing, scrubX, positionSV],
  );

  // Played fraction on the UI thread: the finger wins while scrubbing, then
  // the live shared value, then the (slow) position prop when this timeline
  // isn't the active player.
  const fraction = useDerivedValue(() => {
    if (scrubbing.value > 0) return scrubX.value;
    const pos = positionSV ? positionSV.value : position;
    const f = duration > 0 ? pos / duration : 0;
    return f < 0 ? 0 : f > 1 ? 1 : f;
  }, [positionSV, position, duration]);

  // The accent overlay is clipped with two opposing translateX transforms
  // (window slides right, wave counter-slides left) — pure transforms, so the
  // per-frame cost is zero layout work on both threads.
  const clipStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (fraction.value - 1) * WAVE_W }],
  }));
  const counterStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - fraction.value) * WAVE_W }],
  }));
  const playheadStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: fraction.value * WAVE_W - 1 }],
  }));

  const ticks = Array.from({ length: 7 }, (_, i) =>
    hasSound ? fmtTime((duration * i) / 6) : "0:00",
  );

  return (
    <View style={[styles.card, style]}>
      <GestureDetector gesture={scrub}>
        <View style={styles.visualizer}>
          {hasSound ? (
            <>
              {/* Keyed by sound identity: pointing the timeline at a new sound
                  unmounts the old bars (stagger-collapse) while the new ones
                  build over them (WAV-26). The playhead lives outside the key
                  so it never re-animates. */}
              <React.Fragment key={soundId ?? "wave"}>
                <PeaksWave peaks={peaks!} color={COLORS.white} />
                <Animated.View style={[styles.clip, clipStyle]} pointerEvents="none">
                  <Animated.View style={counterStyle}>
                    <PeaksWave peaks={peaks!} color={COLORS.accent} />
                  </Animated.View>
                </Animated.View>
              </React.Fragment>
              <Animated.View pointerEvents="none" style={[styles.playheadWrap, playheadStyle]}>
                <Svg width={2} height={52} viewBox="0 0 2 52" fill="none">
                  <Path d="M1 51V1" stroke={COLORS.accent} strokeLinecap="round" strokeWidth={2} />
                </Svg>
              </Animated.View>
            </>
          ) : (
            <PlaceholderWave />
          )}
        </View>
      </GestureDetector>

      <View style={styles.timeStrip}>
        {ticks.map((t, i) => (
          <Text key={i} style={styles.timeTick}>{t}</Text>
        ))}
      </View>

      <View style={styles.interactables}>
        <PressableScale onPress={onPlay} style={styles.playBtn}>
          <MorphPlayPause playing={isPlaying} size={24} />
          <GlassEdge radius={25} />
        </PressableScale>

        <View style={styles.timeRow}>
          <PopText style={styles.elapsed}>{fmtTimePad(position)}</PopText>
          <Text style={styles.total}> / {fmtTimePad(duration)}</Text>
        </View>

        <View style={styles.saveSlot}>
          <PressableScale onPress={onSave} style={styles.saveBtn}>
            <DownloadIcon size={20} />
            <Text style={styles.saveBtnLabel}>Save WAV</Text>
            <GlassEdge radius={16} />
          </PressableScale>
        </View>
      </View>
      <GlassEdge radius={34} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    padding: 20,
    borderRadius: 34,
    overflow: "hidden",
    gap: 10,
    ...panelSurface,
  },
  visualizer: { width: WAVE_W, height: WAVE_H, overflow: "hidden", justifyContent: "center" },
  waveBox: { width: WAVE_W, height: WAVE_H },
  clip: {
    position: "absolute", left: 0, right: 0, top: 0, bottom: 0,
    overflow: "hidden", justifyContent: "center",
  },
  playheadWrap: { position: "absolute", left: 0, top: "50%", width: 2, height: 52, marginTop: -26 },
  timeStrip: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  timeTick: { fontFamily: FONT.geistRegular, fontSize: 12, color: COLORS.white, textAlign: "center" },
  interactables: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  // flex-end (not baseline): PopText wraps its value in a View, which has no
  // text baseline — flex-end keeps the elapsed/total digits bottom-aligned.
  timeRow: { flexDirection: "row", alignItems: "flex-end" },
  playBtn: {
    width: 50, height: 50, borderRadius: 25,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
    ...accentSurface,
  },
  elapsed: { fontFamily: FONT.geistRegular, fontSize: 20, color: COLORS.white, textAlign: "center" },
  total: { fontFamily: FONT.geistRegular, fontSize: 16, color: COLORS.white80 },
  saveSlot: { flex: 1, alignItems: "flex-end", justifyContent: "center" },
  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16, overflow: "hidden",
    ...accentSurface,
  },
  saveBtnLabel: { fontFamily: FONT.sfSemibold, fontWeight: "600", fontSize: 12, color: COLORS.white, textAlign: "center" },
});
