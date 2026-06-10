// Filters row + 3-state list. States in the Figma:
//   - unselected : transparent (no surface), just album art + title + duration + play
//   - playing    : flat dark card with thin stroke
//   - editing    : 3 chips side-by-side (base card | red-heart pill | red Delete pill)
import React from "react";
import { View, Text, Image, Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence,
} from "react-native-reanimated";
import Svg, { Rect } from "react-native-svg";
import { GlassEdge } from "./Glass";
import { PressableScale } from "./PressableScale";
import {
  DownloadIcon, HeartIcon, FilterIcon, ChevronDownIcon, TrashIcon,
  PlusIcon, AudioBarsIcon, StudioIcon,
} from "./icons";
import {
  COLORS, FONT, SHADOW_SMALL,
  panelSurface, accentSurface, dangerSurface,
} from "./theme";
import { SPRING } from "./motion";
import { player } from "../../lib/audio-engine";

const ALBUM_ART = require("./assets/album-art.png");

// Cover art: video first frame (data URL) if we have one, else the music glyph
// (studio icon) per WAV-15.
function CoverArt({ uri }: { uri?: string | null }) {
  if (uri) return <Image source={{ uri }} style={styles.albumArt} />;
  return (
    <View style={[styles.albumArt, styles.coverGlyph]}>
      <StudioIcon size={20} />
    </View>
  );
}

// Real per-row visualizer (WAV-17). Static loudness sparkline from PCM peaks at
// 65% opacity when idle (emphasizes it isn't playing); when the row is playing
// the bars move live with the audio via the engine's analyser, at full opacity.
const MINI_N = 9;
function MiniWave({ peaks, playing }: { peaks?: number[]; playing?: boolean }) {
  const [live, setLive] = React.useState<number[] | null>(null);
  React.useEffect(() => {
    if (!playing) { setLive(null); return; }
    let raf = 0;
    const loop = () => {
      setLive(player.levels(MINI_N));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const wrap = (node: React.ReactNode) => (
    <View style={{ opacity: playing ? 1 : 0.65 }}>{node}</View>
  );

  if (!peaks || peaks.length === 0) return wrap(<AudioBarsIcon size={20} />);

  const step = peaks.length / MINI_N;
  const staticBars = Array.from({ length: MINI_N }, (_, i) => peaks[Math.floor(i * step)] ?? 0);
  const bars =
    playing && live && live.length === MINI_N
      ? live.map((v, i) => Math.max(v, staticBars[i] * 0.25)) // floor so it never flatlines
      : staticBars;

  const W = 20, H = 20, slot = W / MINI_N, bw = Math.max(1.5, slot * 0.5);
  return wrap(
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none">
      {bars.map((p, i) => {
        const h = Math.max(2, p * H);
        return (
          <Rect key={i} x={i * slot + (slot - bw) / 2} y={(H - h) / 2}
            width={bw} height={h} rx={bw / 2} fill={COLORS.white} />
        );
      })}
    </Svg>,
  );
}

const GROUP_SPRING = SPRING.snappy;

// "Card resize" reveal (WAV-15): a newly-added row springs in — scales up from
// slightly small + fades + rises — instead of just appearing. Apple .bouncy so
// the new card lands with a touch of life.
function rowEntering() {
  "worklet";
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.92 }, { translateY: 10 }] },
    animations: {
      opacity: withSpring(1, SPRING.smooth),
      transform: [
        { scale: withSpring(1, SPRING.bouncy) },
        { translateY: withSpring(0, SPRING.bouncy) },
      ],
    },
  };
}

// ------- Filters row -------
export function FiltersRow({
  onDownload, onFavorite, onFilter, onFilterMenu,
}: {
  onDownload?: () => void;
  onFavorite?: () => void;
  onFilter?: () => void;
  onFilterMenu?: () => void;
}) {
  // The filter group is visually one button (base + chevron). Both halves keep
  // their own tap action but share ONE press animation so they scale together
  // (WAV-17/18 follow-up). Same tap-visible release as PressableScale.
  const grp = useSharedValue(0);
  const grpStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - grp.value * 0.05 }],
    opacity: 1 - grp.value * 0.1,
  }));
  const grpIn = () => { grp.value = withSpring(1, GROUP_SPRING); };
  const grpOut = () => {
    grp.value = withSequence(withTiming(1, { duration: 90 }), withSpring(0, GROUP_SPRING));
  };

  return (
    <View style={styles.filtersRow}>
      <PressableScale onPress={onDownload} style={styles.iconChip}>
        <DownloadIcon size={20} />
        <GlassEdge radius={16} />
      </PressableScale>

      <PressableScale onPress={onFavorite} style={styles.iconChip}>
        <HeartIcon size={20} />
        <GlassEdge radius={16} />
      </PressableScale>

      <Animated.View style={[styles.filterGroup, grpStyle]}>
        <Pressable onPress={onFilter} onPressIn={grpIn} onPressOut={grpOut} style={styles.filterBase}>
          <FilterIcon size={20} />
          <Text style={styles.filterLabel}>Filter</Text>
          <GlassEdge style={styles.edgeLeft} />
        </Pressable>
        <Pressable onPress={onFilterMenu} onPressIn={grpIn} onPressOut={grpOut} style={styles.filterDropdown}>
          <ChevronDownIcon size={20} />
          <GlassEdge style={styles.edgeRight} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ------- List row variants -------
type RowProps = {
  title: string;
  duration?: string;
  cover?: string | null;
  peaks?: number[];
  onPlay?: () => void;
  onAdd?: () => void;
  style?: StyleProp<ViewStyle>;
};

function RowInner({
  title,
  duration = "00:00",
  cover,
  peaks,
  onPlay,
  onAdd,
  glass = false,
  playing = false,
  onHoverIn,
  onHoverOut,
}: RowProps & { glass?: boolean; playing?: boolean; onHoverIn?: () => void; onHoverOut?: () => void }) {
  return (
    <Pressable
      style={[styles.rowInner, glass && styles.rowInnerCard]}
      onPress={onPlay}
      onHoverIn={onHoverIn}
      onHoverOut={onHoverOut}
    >
      <CoverArt uri={cover} />
      <MiniWave peaks={peaks} playing={playing} />
      <Text style={styles.rowTitle} numberOfLines={1} ellipsizeMode="tail">{title}</Text>
      <View style={styles.rowTail}>
        <Text style={styles.rowDuration}>{duration}</Text>
        <PressableScale onPress={onAdd} style={styles.addBtn}>
          <PlusIcon size={20} />
          <GlassEdge radius={34} />
        </PressableScale>
      </View>
      {glass && <GlassEdge radius={16} />}
    </Pressable>
  );
}

export function ListRowUnselected(p: RowProps) {
  return (
    <View style={[styles.rowOuter, p.style]}>
      <RowInner {...p} glass={false} />
    </View>
  );
}

export function ListRowPlaying(p: RowProps) {
  return (
    <View style={[styles.rowOuter, p.style]}>
      <RowInner {...p} glass />
    </View>
  );
}

// Data-driven row. The glass "selected" surface shows only while playing or
// hovered (WAV-17); otherwise it's the flat unselected state.
export function ListRow({ playing, ...p }: RowProps & { playing?: boolean }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <Animated.View entering={rowEntering as any} style={[styles.rowOuter, p.style]}>
      <RowInner
        {...p}
        glass={!!playing || hovered}
        playing={!!playing}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
      />
    </Animated.View>
  );
}

export function ListRowEditing({
  title,
  onFavorite,
  onDelete,
  style,
}: {
  title: string;
  onFavorite?: () => void;
  onDelete?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.editRow, style]}>
      <View style={styles.editBase}>
        <Image source={ALBUM_ART} style={styles.albumArt} />
        <Text style={styles.rowTitle}>{title}</Text>
        <GlassEdge radius={16} />
      </View>

      <PressableScale onPress={onFavorite} style={styles.favoriteCircle}>
        <HeartIcon size={20} />
        <GlassEdge radius={34} />
      </PressableScale>

      <PressableScale onPress={onDelete} style={styles.deleteBtn}>
        <TrashIcon size={24} />
        <Text style={styles.deleteLabel}>Delete</Text>
        <GlassEdge radius={16} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  // filters
  filtersRow: {
    width: "100%", height: 40,
    flexDirection: "row", alignItems: "center", justifyContent: "flex-end",
    gap: 10,
  },
  iconChip: {
    width: 40, height: 40, borderRadius: 16,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
    ...panelSurface,
  },
  filterGroup: {
    flexDirection: "row", alignItems: "center", height: 40, width: 113,
    borderRadius: 16,
    ...SHADOW_SMALL,
  },
  filterBase: {
    flex: 1, height: "100%",
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingHorizontal: 10,
    borderTopLeftRadius: 16, borderBottomLeftRadius: 16,
    overflow: "hidden",
    ...panelSurface,
  },
  filterDropdown: {
    width: 34, height: "100%",
    alignItems: "center", justifyContent: "center", paddingHorizontal: 5,
    borderTopRightRadius: 16, borderBottomRightRadius: 16,
    overflow: "hidden",
    ...panelSurface,
  },
  edgeLeft: { borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  edgeRight: { borderTopRightRadius: 16, borderBottomRightRadius: 16 },
  filterLabel: { fontFamily: FONT.geistMedium, fontSize: 16, color: COLORS.white, textAlign: "center" },

  // rows
  rowOuter: { width: "100%", borderRadius: 16 },
  rowInner: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, padding: 10, borderRadius: 16, overflow: "hidden",
  },
  rowInnerCard: { ...panelSurface },
  albumArt: { width: 40, height: 40, borderRadius: 8 },
  coverGlyph: { alignItems: "center", justifyContent: "center", backgroundColor: COLORS.white10 },
  rowTitle: { flex: 1, minWidth: 0, fontFamily: FONT.geistMedium, fontSize: 16, color: COLORS.white, textAlign: "left" },
  rowTail: { flexShrink: 0, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 10 },
  rowDuration: { fontFamily: FONT.geistRegular, fontSize: 16, color: COLORS.white80, textAlign: "center" },
  addBtn: {
    width: 35, height: 35, borderRadius: 34,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
    ...accentSurface,
  },

  // edit row — all three chips are 60px tall (favorite is 40, centered)
  editRow: { width: "100%", height: 60, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  editBase: {
    flex: 1, height: 60,
    flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10,
    borderRadius: 16, overflow: "hidden",
    ...panelSurface,
  },
  favoriteCircle: {
    width: 40, height: 40, borderRadius: 34,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
    ...panelSurface,
  },
  deleteBtn: {
    height: 60,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    paddingHorizontal: 16,
    borderRadius: 16, overflow: "hidden",
    ...dangerSurface,
  },
  deleteLabel: { fontFamily: FONT.geistMedium, fontSize: 16, color: COLORS.white, textAlign: "center" },
});
