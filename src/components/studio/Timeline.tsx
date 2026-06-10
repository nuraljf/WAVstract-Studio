import React from "react";
import {
  View, Text, Pressable, StyleSheet,
  type GestureResponderEvent, type StyleProp, type ViewStyle,
} from "react-native";
import Svg, { Path, G, Rect } from "react-native-svg";
import { GlassEdge } from "./Glass";
import { PressableScale } from "./PressableScale";
import { MorphPlayPause } from "./MorphPlayPause";
import { PopText } from "./PopText";
import { DownloadIcon } from "./icons";
import { COLORS, FONT, panelSurface, accentSurface } from "./theme";
import { fmtTime } from "../../lib/use-studio";
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

// Real waveform from decoded PCM peaks. Bars before the playhead are accent,
// the rest are white — so the colour fills as the track plays.
function PeaksWave({ peaks, playedFraction }: { peaks: number[]; playedFraction: number }) {
  const n = peaks.length;
  const slot = WAVE_W / n;
  const barW = Math.max(1.5, slot * 0.55);
  return (
    <Svg width={WAVE_W} height={WAVE_H} viewBox={`0 0 ${WAVE_W} ${WAVE_H}`} fill="none">
      {peaks.map((p, i) => {
        const h = Math.max(2, p * WAVE_H);
        const x = i * slot + (slot - barW) / 2;
        const y = (WAVE_H - h) / 2;
        const played = i / n <= playedFraction;
        return (
          <Rect
            key={i}
            x={x}
            y={y}
            width={barW}
            height={h}
            rx={barW / 2}
            fill={played ? COLORS.accent : COLORS.white}
          />
        );
      })}
    </Svg>
  );
}

function Playhead({ fraction }: { fraction: number }) {
  const left = Math.max(0, Math.min(1, fraction)) * WAVE_W - 1;
  return (
    <View pointerEvents="none" style={[styles.playheadWrap, { left }]}>
      <Svg width={2} height={52} viewBox="0 0 2 52" fill="none">
        <Path d="M1 51V1" stroke={COLORS.accent} strokeLinecap="round" strokeWidth={2} />
      </Svg>
    </View>
  );
}

export type TimelineProps = {
  peaks?: number[];
  position?: number;   // seconds
  duration?: number;   // seconds
  isPlaying?: boolean;
  onPlay?: () => void;
  onSave?: () => void;
  onSeek?: (seconds: number) => void;
  style?: StyleProp<ViewStyle>;
};

export default function Timeline({
  peaks,
  position = 0,
  duration = 0,
  isPlaying = false,
  onPlay,
  onSave,
  onSeek,
  style,
}: TimelineProps) {
  const hasSound = !!peaks && peaks.length > 0 && duration > 0;
  const fraction = hasSound ? position / duration : 0;

  const ticks = Array.from({ length: 7 }, (_, i) =>
    hasSound ? fmtTime((duration * i) / 6) : "0:00",
  );

  const handleSeek = (e: GestureResponderEvent) => {
    if (!hasSound || !onSeek) return;
    // react-native-web doesn't always populate locationX — fall back to the
    // DOM offsetX, and bail if neither is a finite number (avoids a NaN seek).
    const ne: any = e.nativeEvent;
    const x = Number.isFinite(ne.locationX) ? ne.locationX : ne.offsetX;
    if (!Number.isFinite(x)) return;
    onSeek(Math.max(0, Math.min(1, x / WAVE_W)) * duration);
  };

  return (
    <View style={[styles.card, style]}>
      <Pressable style={styles.visualizer} onPress={handleSeek} disabled={!hasSound}>
        {hasSound ? <PeaksWave peaks={peaks!} playedFraction={fraction} /> : <PlaceholderWave />}
        {hasSound && <Playhead fraction={fraction} />}
      </Pressable>

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
          <PopText style={styles.elapsed}>{fmtTime(position)}</PopText>
          <Text style={styles.total}> / {fmtTime(duration)}</Text>
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
  playheadWrap: { position: "absolute", top: "50%", width: 2, height: 52, marginTop: -26 },
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
