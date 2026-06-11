// Full studio screen — new fixed layout from Figma 244:3303. The timeline,
// slider, extract button and filters stay put; ONLY the audio list scrolls
// (Figma 244:3575), fading out under the bottom edge effect + tab bar.
import React, { useState } from "react";
import { View, ScrollView, Text, StyleSheet, SafeAreaView, Platform } from "react-native";
import Timeline from "./Timeline";
import SpeedSlider from "./SpeedSlider";
import { FiltersRow, ListRow, EmptyTable } from "./AudioList";
import TabBar, { type TabKey } from "./TabBar";
import SettingsScreen from "./SettingsScreen";
import { AmbientGradient } from "./AmbientGradient";
import { GlassEdge } from "./Glass";
import { PressableScale } from "./PressableScale";
import { UploadIcon } from "./icons";
import { COLORS, FONT, FRAME_W, accentSurface } from "./theme";
import { useStudio, fmtTime, type Sound } from "../../lib/use-studio";
import { LoadingBars } from "./LoadingBars";

// Memoized row wrapper: while a sound plays, only the ACTIVE row's elapsed
// label changes — every other row's props are stable, so they skip re-render
// entirely. Re-rendering all rows each second re-attached their swipe
// gestures, which is what froze list scrolling during playback.
const SoundRow = React.memo(function SoundRow({
  s, playing, timeLabel,
  togglePlay, addToTimeline, removeSound, toggleFavorite, retryUpload,
}: {
  s: Sound;
  playing: boolean;
  timeLabel: string;
  togglePlay: (id: string) => void;
  addToTimeline: (id: string) => void;
  removeSound: (id: string) => void;
  toggleFavorite: (id: string) => void;
  retryUpload: (id: string) => void;
}) {
  return (
    <ListRow
      title={s.name}
      duration={timeLabel}
      cover={s.cover}
      peaks={s.peaks}
      favorite={s.favorite}
      sync={s.sync}
      playing={playing}
      onPlay={() => togglePlay(s.id)}
      onAdd={() => addToTimeline(s.id)}
      onDelete={() => removeSound(s.id)}
      onFavorite={() => toggleFavorite(s.id)}
      onRetry={() => retryUpload(s.id)}
    />
  );
});

function StudioTab() {
  const {
    sounds, activeId, isPlaying, position, positionSV, timelineSound, supported, cloudLoading,
    extract, togglePlay, addToTimeline, removeSound, toggleFavorite, retryUpload, seek, setSpeed,
  } = useStudio();

  // The Timeline only reflects live playback when ITS sound is the one loaded in
  // the player. If you select a different table sound, the timeline resets to
  // idle and that second sound only animates in the table (WAV-17 #1 follow-up).
  const timelineActive = !!timelineSound && timelineSound.id === activeId;

  return (
    <View style={styles.studio}>
      {/* fixed: timeline + speed slider */}
      <View style={styles.timelineGroup}>
        <Timeline
          soundId={timelineSound?.id}
          peaks={timelineSound?.peaks}
          position={timelineActive ? position : 0}
          positionSV={timelineActive ? positionSV : undefined}
          duration={timelineSound?.duration ?? 0}
          isPlaying={timelineActive && isPlaying}
          // the timeline is the ONLY place a pause keeps its position
          onPlay={() => timelineSound && togglePlay(timelineSound.id, true)}
          onSeek={timelineActive ? seek : undefined}
        />
        {/* keyed by the active sound: switching tracks remounts the slider at
            its 1.0x default (the engine rate is reset in use-studio) */}
        <SpeedSlider key={activeId ?? "init"} onChange={setSpeed} />
      </View>

      {/* fixed: extract + filters */}
      <View style={styles.tableGroup}>
        <PressableScale onPress={extract} style={styles.extract}>
          <UploadIcon size={20} />
          <Text style={styles.extractLabel}>Extract audio</Text>
          <GlassEdge radius={34} />
        </PressableScale>

        <View style={styles.table}>
          <FiltersRow />

          {/* the ONLY scrollable region — the audio list */}
          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {sounds.length === 0 ? (
              cloudLoading ? (
                <View style={styles.cloudLoading}>
                  <LoadingBars size={24} />
                </View>
              ) : supported ? (
                <EmptyTable />
              ) : (
                <Text style={styles.empty}>Audio playback is web-only for now.</Text>
              )
            ) : (
              sounds.map((s) => (
                <SoundRow
                  key={s.id}
                  s={s}
                  playing={isPlaying && s.id === activeId}
                  // active row rolls the live elapsed second; others show length
                  timeLabel={s.id === activeId ? fmtTime(position) : fmtTime(s.duration)}
                  togglePlay={togglePlay}
                  addToTimeline={addToTimeline}
                  removeSound={removeSound}
                  toggleFavorite={toggleFavorite}
                  retryUpload={retryUpload}
                />
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

export default function StudioScreen() {
  const [tab, setTab] = useState<TabKey>("studio");
  const { timelineSound, activeId, isPlaying } = useStudio();
  const timelinePlaying = !!timelineSound && timelineSound.id === activeId && isPlaying;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Phone-width frame, centered (so the web preview matches the device). */}
      <View style={styles.frame}>
        {/* audio-reactive glow (WAV-30): hugs the TOP edge in the studio,
            appears only while the timeline's sound is playing, and its layers
            ride the live band energies */}
        {tab === "studio" && <AmbientGradient reactive anchor="top" playing={timelinePlaying} />}
        {tab === "studio" ? (
          <StudioTab />
        ) : tab === "settings" ? (
          <View style={styles.page}>
            <SettingsScreen />
          </View>
        ) : (
          <View style={[styles.page, styles.centerPage]}>
            <Text style={styles.empty}>Library is coming soon.</Text>
          </View>
        )}

        {/* bottom edge effect (Figma 244:3572): content fades + blurs away
            under the floating tab bar */}
        <View pointerEvents="none" style={styles.edgeFade} />
        <View style={styles.tabBarHolder} pointerEvents="box-none">
          <TabBar active={tab} onChange={setTab} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  frame: { flex: 1, width: "100%", maxWidth: FRAME_W, alignSelf: "center" },

  studio: { flex: 1, paddingHorizontal: 20, paddingTop: 20, gap: 30 },
  page: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  centerPage: { alignItems: "center", justifyContent: "center" },

  timelineGroup: { width: "100%", gap: 10, alignItems: "center" },

  tableGroup: { flex: 1, width: "100%", gap: 30, alignItems: "center", minHeight: 0 },
  extract: {
    width: "100%",
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingHorizontal: 20, paddingVertical: 16,
    borderRadius: 34, overflow: "hidden",
    ...accentSurface,
  },
  extractLabel: {
    fontFamily: FONT.sfMedium, fontWeight: "500", fontSize: 16,
    color: COLORS.white, textAlign: "center",
  },

  table: { flex: 1, width: "100%", gap: 10, minHeight: 0 },
  listScroll: { flex: 1, width: "100%" },
  listContent: { gap: 10, paddingBottom: 120 }, // room to scroll past the tab bar
  cloudLoading: { paddingVertical: 24, alignItems: "center" },
  empty: {
    fontFamily: FONT.geistRegular, fontSize: 13, color: COLORS.white50,
    textAlign: "center", paddingVertical: 16,
  },

  edgeFade: {
    position: "absolute", left: 0, right: 0, bottom: 0, height: 84,
    ...(Platform.OS === "web"
      ? ({
          backgroundImage: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.65) 100%)",
          backdropFilter: "blur(5px)",
          WebkitBackdropFilter: "blur(5px)",
          maskImage: "linear-gradient(to bottom, transparent 0%, black 60%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 60%)",
        } as object)
      : ({ backgroundColor: "rgba(0,0,0,0.5)" } as object)),
  },

  tabBarHolder: {
    position: "absolute", left: 0, right: 0, bottom: 20,
    alignItems: "center",
  },
});
