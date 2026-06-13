// Library tab (WAV-58): a paste-a-link bar at the top that extracts audio
// straight from a TikTok / Instagram video URL into the table, above the user's
// full sound library (the same rows as the studio table).
import React from "react";
import { View, Text, TextInput, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ListRow, EmptyTable } from "./AudioList";
import { PressableScale } from "./PressableScale";
import { GlassEdge } from "./Glass";
import { LinkIcon, UploadIcon } from "./icons";
import { LoadingBars } from "./LoadingBars";
import { COLORS, FONT, panelSurface, accentSurface } from "./theme";
import { useStudio, fmtTime } from "../../lib/use-studio";

export default function LibraryScreen() {
  const {
    sounds, activeId, isPlaying, cloudLoading, supported,
    extractFromUrl, togglePlay, addToTimeline, removeSound, toggleFavorite, retryUpload,
  } = useStudio();

  const insets = useSafeAreaInsets();
  const [url, setUrl] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onExtract = async () => {
    const v = url.trim();
    if (!v || busy) return;
    setBusy(true);
    setError(null);
    try {
      await extractFromUrl(v);
      setUrl(""); // the new row springs into the list below
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't extract that link.");
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = !!url.trim() && !busy;

  return (
    <View style={styles.wrap}>
      {/* paste-a-link bar */}
      <View style={styles.barRow}>
        <View style={styles.bar}>
          <LinkIcon size={20} />
          <TextInput
            value={url}
            onChangeText={setUrl}
            onSubmitEditing={onExtract}
            placeholder="Paste a TikTok or Instagram link"
            placeholderTextColor={COLORS.white50}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
            editable={!busy}
          />
          <GlassEdge radius={16} />
        </View>
        <PressableScale onPress={onExtract} style={[styles.addBtn, !canSubmit && styles.addBtnOff]} disabled={!canSubmit}>
          {busy ? <LoadingBars size={20} /> : <UploadIcon size={20} />}
          <Text style={styles.addLabel}>{busy ? "Extracting" : "Add"}</Text>
          <GlassEdge radius={16} />
        </PressableScale>
      </View>

      <Text style={error ? styles.error : styles.hint}>
        {error ?? "Paste a video link and its sound is added to your library."}
      </Text>

      {/* the library list — same rows as the studio table */}
      <View style={styles.listBox}>
        <ScrollView contentContainerStyle={[styles.listContent, { paddingBottom: 120 + insets.bottom }]} showsVerticalScrollIndicator={false}>
          {sounds.length === 0 ? (
            cloudLoading ? (
              <View style={styles.loading}><LoadingBars size={24} /></View>
            ) : supported ? (
              <EmptyTable />
            ) : (
              <Text style={styles.empty}>Audio is web-only for now.</Text>
            )
          ) : (
            sounds.map((s) => (
              <ListRow
                key={s.id}
                title={s.name}
                duration={fmtTime(s.duration)}
                cover={s.cover}
                peaks={s.peaks}
                favorite={s.favorite}
                sync={s.sync}
                playing={isPlaying && s.id === activeId}
                onPlay={() => togglePlay(s.id)}
                onAdd={() => addToTimeline(s.id)}
                onDelete={() => removeSound(s.id)}
                onFavorite={() => toggleFavorite(s.id)}
                onRetry={() => retryUpload(s.id)}
              />
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, width: "100%", gap: 10, minHeight: 0 },

  barRow: { width: "100%", flexDirection: "row", alignItems: "center", gap: 10 },
  bar: {
    flex: 1, height: 48, flexDirection: "row", alignItems: "center",
    gap: 8, paddingHorizontal: 14, borderRadius: 16, overflow: "hidden",
    ...panelSurface,
  },
  input: {
    flex: 1, minWidth: 0, height: "100%",
    fontFamily: FONT.geistMedium, fontSize: 15, color: COLORS.white,
    // strip the web input's default outline/border
    ...({ outlineStyle: "none", borderWidth: 0 } as object),
  },
  addBtn: {
    height: 48, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingHorizontal: 16, borderRadius: 16, overflow: "hidden",
    ...accentSurface,
  },
  addBtnOff: { opacity: 0.5 },
  addLabel: { fontFamily: FONT.geistMedium, fontSize: 15, color: COLORS.white, textAlign: "center" },

  hint: { fontFamily: FONT.geistRegular, fontSize: 13, color: COLORS.white50, paddingHorizontal: 4 },
  error: { fontFamily: FONT.geistMedium, fontSize: 13, color: COLORS.danger, paddingHorizontal: 4 },

  listBox: { flex: 1, width: "100%", minHeight: 0 },
  listContent: { gap: 10, paddingBottom: 120 },
  loading: { paddingVertical: 24, alignItems: "center" },
  empty: {
    fontFamily: FONT.geistRegular, fontSize: 13, color: COLORS.white50,
    textAlign: "center", paddingVertical: 16,
  },
});
