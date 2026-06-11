// Filters row + 3-state list. States in the Figma:
//   - unselected : transparent (no surface), just album art + title + duration + play
//   - playing    : flat dark card with thin stroke
//   - editing    : swipe LEFT on a row to reveal the actions (heart pill +
//                  red Delete pill, Figma node 199:252); swipe right / tap closes
import React from "react";
import { View, Text, Image, Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedReaction,
  withSpring, withTiming, withSequence, runOnJS,
  LinearTransition, type SharedValue,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
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
import { LoadingBars, ShimmerText } from "./LoadingBars";
import { player } from "../../lib/audio-engine";
import type { SyncState } from "../../lib/use-studio";

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

// Real per-row visualizer (WAV-17 / WAV-25). Static loudness sparkline from
// PCM peaks at 65% opacity when idle (emphasizes it isn't playing); while the
// row is playing the bars ALWAYS move at full opacity — live from the engine's
// analyser when it has a tap (buffer sources), otherwise a synthetic groove
// (element/video sources play outside the Web Audio graph, WAV-22).
const MINI_N = 9;
function MiniWave({ peaks, playing }: { peaks?: number[]; playing?: boolean }) {
  const [live, setLive] = React.useState<number[] | null>(null);
  React.useEffect(() => {
    if (!playing) {
      setLive(null);
      return;
    }
    // Per-bar oscillation with mismatched frequencies/phases — reads as music
    // even though no analyser data exists for element sources.
    const synth = () => {
      const t = performance.now() / 1000;
      return Array.from({ length: MINI_N }, (_, i) =>
        0.3 + 0.7 * Math.abs(Math.sin(t * (2.1 + (i % 4) * 0.9) + i * 1.9)));
    };
    let raf = 0;
    let frame = 0;
    const loop = () => {
      // every 3rd frame (~20fps) — indistinguishable on a 20px meter, third the work
      if (++frame % 3 === 0) setLive(player.hasLiveLevels ? player.levels(MINI_N) : synth());
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

// Deleted row: quick scale-down + fade (the inverse of the entrance); the
// rows below spring up into the gap via the list's layout transition.
function rowExiting() {
  "worklet";
  return {
    initialValues: { opacity: 1, transform: [{ scale: 1 }, { translateY: 0 }] },
    animations: {
      opacity: withTiming(0, { duration: 220 }),
      transform: [
        { scale: withTiming(0.9, { duration: 220 }) },
        { translateY: withTiming(6, { duration: 220 }) },
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
  favorite?: boolean;
  sync?: SyncState; // uploading/downloading → busy meter; failed → red retry row
  onPlay?: () => void;
  onAdd?: () => void;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
};

function RowInner({
  title,
  duration = "00:00",
  cover,
  peaks,
  favorite = false,
  sync = "local",
  onPlay,
  onAdd,
  onRetry,
  glass = false,
  playing = false,
  editing = false,
  editProgress,
  onHoverIn,
  onHoverOut,
}: RowProps & {
  glass?: boolean;
  playing?: boolean;
  editing?: boolean;
  editProgress?: SharedValue<number>;
  onHoverIn?: () => void;
  onHoverOut?: () => void;
}) {
  const busy = sync === "uploading" || sync === "downloading";
  // Editing base shows only cover + title (Figma 199:253) — the wave and the
  // duration/+ tail fade AND collapse as the swipe progresses, so the title
  // keeps the room the actions take away.
  const fallback = useSharedValue(0);
  const edit = editProgress ?? fallback;
  const waveCollapse = useAnimatedStyle(() => {
    const e = Math.min(edit.value, 1);
    return { opacity: 1 - e };
  });
  const tailCollapse = useAnimatedStyle(() => {
    const e = Math.min(edit.value, 1);
    return { opacity: 1 - e, maxWidth: 120 * (1 - e) };
  });

  // The liquid-glass surface fades in/out (WAV-25) instead of snapping — the
  // fill, blur and corner highlights all ride one opacity.
  const surface = useSharedValue(glass ? 1 : 0);
  React.useEffect(() => {
    surface.value = withTiming(glass ? 1 : 0, { duration: 240 });
  }, [glass, surface]);
  const surfaceStyle = useAnimatedStyle(() => ({ opacity: surface.value }));

  return (
    <PressableScale
      style={styles.rowInner}
      scaleTo={0.98}
      dim={0.05}
      onPress={sync === "failed" ? onRetry : onPlay}
      disabled={busy}
      onHoverIn={onHoverIn}
      onHoverOut={onHoverOut}
    >
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.rowGlass, surfaceStyle]}>
        <GlassEdge radius={16} />
      </Animated.View>
      {busy ? (
        // Uploading / first-device download (Figma 244:3632): live bars meter +
        // gradient-sweeping label. Same 60px row so the list doesn't jump.
        <View style={styles.statusInner}>
          <LoadingBars size={24} />
          <ShimmerText style={styles.statusText}>
            {sync === "uploading" ? "Uploading" : "Loading"}
          </ShimmerText>
        </View>
      ) : sync === "failed" ? (
        // Upload failed (Figma 244:3716) — tapping the row retries.
        <View style={styles.statusInner}>
          <Text style={styles.failedText}>Failed to upload, try again.</Text>
        </View>
      ) : (
        <>
          <CoverArt uri={cover} />
          <Animated.View style={waveCollapse}>
            <MiniWave peaks={peaks} playing={playing} />
          </Animated.View>
          <Text style={styles.rowTitle} numberOfLines={1} ellipsizeMode="tail">{title}</Text>
          <Animated.View style={[styles.rowTail, tailCollapse]} pointerEvents={editing ? "none" : "auto"}>
            {favorite && <HeartIcon size={12} />}
            <Text style={styles.rowDuration}>{duration}</Text>
            <PressableScale onPress={onAdd} style={styles.addBtn}>
              <PlusIcon size={20} />
              <GlassEdge radius={34} />
            </PressableScale>
          </Animated.View>
        </>
      )}
    </PressableScale>
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

// Swipe-to-edit geometry (Figma 199:252): heart circle + Delete pill + gaps.
const FAV_W = 40;
const DEL_W = 100;
const AGAP = 10;
const REVEAL = FAV_W + AGAP + DEL_W + AGAP; // width the base card gives up

// Data-driven row. The glass "selected" surface shows while playing, hovered
// (WAV-17) or in the swipe-open editing state (WAV-24); otherwise it's the
// flat unselected state.
export function ListRow({
  playing,
  onDelete,
  onFavorite,
  ...p
}: RowProps & {
  playing?: boolean;
  onDelete?: () => void;
  onFavorite?: () => void;
}) {
  const [hovered, setHovered] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const open = useSharedValue(0); // 0 closed … 1 actions revealed (>1 = rubber)
  const start = useSharedValue(0);
  const busy = p.sync === "uploading" || p.sync === "downloading";

  useAnimatedReaction(
    () => open.value > 0.03,
    (now, prev) => {
      if (now !== prev) runOnJS(setEditing)(now);
    },
  );

  const close = React.useCallback(() => {
    open.value = withSpring(0, SPRING.snappy);
  }, [open]);

  // Horizontal-only pan: a vertical move fails the gesture so the list still
  // scrolls; a sub-threshold move stays a tap (play / close). The settle runs
  // in BOTH onEnd and onFinalize — a cancelled gesture (scroll steal, lost
  // pointer on iOS) skips onEnd, which is what left rows stranded mid-swipe.
  const pan = Gesture.Pan()
    .enabled(!busy)
    .activeOffsetX([-16, 16])
    .failOffsetY([-12, 12])
    .shouldCancelWhenOutside(false)
    .onStart(() => {
      start.value = open.value;
    })
    .onUpdate((e) => {
      const raw = start.value - e.translationX / REVEAL;
      open.value = raw < 0 ? 0 : raw > 1.12 ? 1.12 : raw; // rubber past fully-open
    })
    .onEnd((e) => {
      const opening = e.velocityX < -300 || (open.value > 0.5 && e.velocityX < 300);
      open.value = withSpring(opening ? 1 : 0, SPRING.snappy);
    })
    .onFinalize((_e, success) => {
      if (!success) {
        // gesture cancelled before onEnd — always finish to a resting state
        open.value = withSpring(open.value > 0.5 ? 1 : 0, SPRING.snappy);
      }
    });

  const baseStyle = useAnimatedStyle(() => ({
    marginRight: Math.min(open.value, 1.12) * REVEAL,
  }));
  // Liquid-glass reveal (no fades): the actions live UNDER the base card and
  // slide out of its trailing edge as it gives way — the clip window below
  // hides whatever is still "inside" the card, so they appear to morph out of
  // it, like swiping an iOS notification.
  const actionsStyle = useAnimatedStyle(() => {
    const e = Math.min(open.value, 1);
    return { transform: [{ translateX: -(1 - e) * REVEAL }] };
  });
  // The heart starts FUSED to the delete pill (gap closed) and breaks off once
  // the swipe commits — the "disconnect" moment of the liquid glass look.
  const heartStyle = useAnimatedStyle(() => {
    const split = Math.min(Math.max((open.value - 0.55) / 0.45, 0), 1);
    return { transform: [{ translateX: (1 - split) * AGAP }] };
  });

  return (
    <Animated.View
      entering={rowEntering as any}
      exiting={rowExiting as any}
      layout={LinearTransition.springify()}
      style={[styles.rowOuter, styles.rowSwipeOuter, p.style]}
    >
      <View style={styles.actionsWrap} pointerEvents={editing ? "auto" : "none"}>
        <Animated.View style={[styles.actionsRow, actionsStyle]}>
          <Animated.View style={heartStyle}>
            <PressableScale
              onPress={() => {
                onFavorite?.();
                close();
              }}
              style={styles.favoriteCircle}
            >
              {/* White @80% = not favorited; the heart takes its full red only
                  once the sound IS a favorite (WAV-25). */}
              <View style={{ opacity: p.favorite ? 1 : 0.8 }}>
                <HeartIcon size={20} color={p.favorite ? COLORS.danger : COLORS.white} />
              </View>
              <GlassEdge radius={34} />
            </PressableScale>
          </Animated.View>
          <PressableScale onPress={onDelete} style={styles.deleteBtn}>
            <TrashIcon size={24} />
            <Text style={styles.deleteLabel}>Delete</Text>
            <GlassEdge radius={16} />
          </PressableScale>
        </Animated.View>
      </View>

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.baseWrap, baseStyle]}>
          <RowInner
            {...p}
            glass={!!playing || hovered || editing}
            playing={!!playing}
            editing={editing}
            editProgress={open}
            onPlay={editing ? close : p.onPlay}
            onHoverIn={() => setHovered(true)}
            onHoverOut={() => setHovered(false)}
          />
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

// ------- Empty state (Figma 244:3715) -------
// "Extract audio to get started" over a ghosted deck of three row cards.
export function EmptyTable() {
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyTitle}>Extract audio to get started</Text>
      <View style={styles.ghostGroup}>
        <View style={[styles.ghostCard, { width: 297, top: 27 }]}>
          <GlassEdge radius={16} />
        </View>
        <View style={[styles.ghostCard, { width: 322, top: 15 }]}>
          <GlassEdge radius={16} />
        </View>
        <View style={[styles.ghostCard, styles.ghostFront]}>
          <View style={styles.ghostIcon} />
          <View style={styles.ghostDot} />
          <View style={styles.ghostBar} />
          <View style={{ flex: 1 }} />
          <View style={styles.ghostPlay} />
          <GlassEdge radius={16} />
        </View>
      </View>
    </View>
  );
}

// Static editing-state variant (design reference / DevTools).
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
  rowSwipeOuter: { flexDirection: "row" },
  baseWrap: { flex: 1 },
  rowInner: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, padding: 10, borderRadius: 16, overflow: "hidden",
  },
  rowGlass: { borderRadius: 16, ...panelSurface },
  // Solid backing so the cover always reads 100% opaque, even over glass or
  // when a video frame carries an alpha channel (WAV-25).
  albumArt: { width: 40, height: 40, borderRadius: 8, backgroundColor: "#101010", opacity: 1 },
  coverGlyph: { alignItems: "center", justifyContent: "center", backgroundColor: COLORS.white10 },
  rowTitle: { flex: 1, minWidth: 0, fontFamily: FONT.geistMedium, fontSize: 16, color: COLORS.white, textAlign: "left" },
  rowTail: {
    flexShrink: 0, flexDirection: "row", alignItems: "center", justifyContent: "flex-end",
    gap: 10, overflow: "hidden",
  },
  rowDuration: { fontFamily: FONT.geistRegular, fontSize: 16, color: COLORS.white80, textAlign: "center" },
  addBtn: {
    width: 35, height: 35, borderRadius: 34,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
    ...accentSurface,
  },

  // swipe-revealed actions (pinned behind the base, right-aligned). The wrap
  // clips, so the actions stay invisible while still "inside" the base card
  // and slide out of its trailing edge as the swipe progresses (no fades).
  actionsWrap: {
    position: "absolute", right: 0, top: 0, bottom: 0,
    width: FAV_W + AGAP + DEL_W,
    alignItems: "center", justifyContent: "flex-end",
    flexDirection: "row",
    overflow: "hidden",
  },
  actionsRow: { flexDirection: "row", alignItems: "center", gap: AGAP, height: "100%" },

  // uploading / failed row states (Figma 244:3632 / 244:3716)
  statusInner: {
    height: 40, flex: 1,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
  },
  statusText: { fontFamily: FONT.geistMedium, fontSize: 16, textAlign: "center", color: COLORS.white },
  failedText: { fontFamily: FONT.geistMedium, fontSize: 16, textAlign: "center", color: COLORS.danger },

  // empty state (Figma 244:3715)
  emptyWrap: { width: "100%", gap: 10, alignItems: "center" },
  emptyTitle: { fontFamily: FONT.geistMedium, fontSize: 16, color: COLORS.white, textAlign: "center" },
  ghostGroup: { width: "100%", height: 90, alignItems: "center" },
  ghostCard: {
    position: "absolute", height: 60, borderRadius: 16,
    backgroundColor: "#000000", overflow: "hidden",
  },
  ghostFront: {
    width: "100%", top: 0,
    flexDirection: "row", alignItems: "center", gap: 5, padding: 10,
  },
  ghostIcon: { width: 40, height: 40, borderRadius: 8, backgroundColor: COLORS.white50 },
  ghostDot: { width: 20, height: 20, borderRadius: 20, backgroundColor: COLORS.white50 },
  ghostBar: { width: 89, height: 14, borderRadius: 20, backgroundColor: COLORS.white50 },
  ghostPlay: { width: 35, height: 35, borderRadius: 20, backgroundColor: COLORS.white50 },

  // edit row — all three chips are 60px tall (favorite is 40, centered)
  editRow: { width: "100%", height: 60, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  editBase: {
    flex: 1, height: 60,
    flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10,
    borderRadius: 16, overflow: "hidden",
    ...panelSurface,
  },
  favoriteCircle: {
    width: FAV_W, height: 40, borderRadius: 34,
    alignSelf: "center",
    alignItems: "center", justifyContent: "center", overflow: "hidden",
    ...panelSurface,
  },
  deleteBtn: {
    width: DEL_W, height: "100%",
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    padding: 10,
    borderRadius: 16, overflow: "hidden",
    ...dangerSurface,
  },
  deleteLabel: { fontFamily: FONT.geistMedium, fontSize: 16, color: COLORS.white, textAlign: "center" },
});
