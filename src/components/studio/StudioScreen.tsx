// Full studio screen — pixel layout from Figma "Mobile-1" frame (402×811).
// Now wired to the audio engine (WAV-16): Extract decodes a local file, the
// list plays it, "+" sends it to the Timeline, and the slider drives speed+pitch.
import React, { useState } from "react";
import { View, ScrollView, Text, StyleSheet, SafeAreaView } from "react-native";
import Timeline from "./Timeline";
import SpeedSlider from "./SpeedSlider";
import { FiltersRow, ListRow } from "./AudioList";
import TabBar, { type TabKey } from "./TabBar";
import { GlassEdge } from "./Glass";
import { PressableScale } from "./PressableScale";
import { UploadIcon } from "./icons";
import { COLORS, FONT, FRAME_W, accentSurface } from "./theme";
import { useStudio, fmtTime } from "../../lib/use-studio";

export default function StudioScreen() {
  const [tab, setTab] = useState<TabKey>("studio");
  const {
    sounds, activeId, isPlaying, position, positionSV, timelineSound, supported,
    extract, togglePlay, addToTimeline, removeSound, toggleFavorite, seek, setSpeed,
  } = useStudio();

  // The Timeline only reflects live playback when ITS sound is the one loaded in
  // the player. If you select a different table sound, the timeline resets to
  // idle and that second sound only animates in the table (WAV-17 #1 follow-up).
  const timelineActive = !!timelineSound && timelineSound.id === activeId;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Phone-width frame, centered (so the web preview matches the device). */}
      <View style={styles.frame}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Timeline + Speed slider group */}
          <View style={styles.timelineGroup}>
            <Timeline
              peaks={timelineSound?.peaks}
              position={timelineActive ? position : 0}
              positionSV={timelineActive ? positionSV : undefined}
              duration={timelineSound?.duration ?? 0}
              isPlaying={timelineActive && isPlaying}
              onPlay={() => timelineSound && togglePlay(timelineSound.id)}
              onSeek={timelineActive ? seek : undefined}
            />
            <SpeedSlider onChange={setSpeed} />
          </View>

          {/* Extract audio primary action */}
          <PressableScale onPress={extract} style={styles.extract}>
            <UploadIcon size={20} />
            <Text style={styles.extractLabel}>Extract audio</Text>
            <GlassEdge radius={34} />
          </PressableScale>

          {/* Filters + list */}
          <View style={styles.tableGroup}>
            <FiltersRow />
            <View style={styles.list}>
              {sounds.length === 0 ? (
                <Text style={styles.empty}>
                  {supported
                    ? "Press Extract audio to add a local file."
                    : "Audio playback is web-only for now."}
                </Text>
              ) : (
                sounds.map((s) => (
                  <ListRow
                    key={s.id}
                    title={s.name}
                    duration={fmtTime(s.duration)}
                    cover={s.cover}
                    peaks={s.peaks}
                    favorite={s.favorite}
                    playing={isPlaying && s.id === activeId}
                    onPlay={() => togglePlay(s.id)}
                    onAdd={() => addToTimeline(s.id)}
                    onDelete={() => removeSound(s.id)}
                    onFavorite={() => toggleFavorite(s.id)}
                  />
                ))
              )}
            </View>
          </View>
        </ScrollView>

        {/* Floating tab bar */}
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
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120, // leave room for floating tab bar
    gap: 30,
    alignItems: "center",
  },
  timelineGroup: { width: "100%", gap: 10, alignItems: "center" },

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

  tableGroup: { width: "100%", gap: 10, alignItems: "center" },
  list: { gap: 10, width: "100%" },
  empty: {
    fontFamily: FONT.geistRegular, fontSize: 13, color: COLORS.white50,
    textAlign: "center", paddingVertical: 16,
  },

  tabBarHolder: {
    position: "absolute", left: 0, right: 0, bottom: 20,
    alignItems: "center",
  },
});
