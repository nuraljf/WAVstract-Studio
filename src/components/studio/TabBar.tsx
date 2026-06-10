import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { GlassEdge } from "./Glass";
import { PressableScale } from "./PressableScale";
import { StudioIcon, DownloadIcon, SettingsIcon } from "./icons";
import { COLORS, FONT, panelSurface } from "./theme";

export type TabKey = "studio" | "library" | "settings";

const TABS: { key: TabKey; label: string; Icon: React.FC<{ size?: number; color?: string }> }[] = [
  { key: "studio",   label: "Studio",   Icon: StudioIcon },
  { key: "library",  label: "Library",  Icon: DownloadIcon },
  { key: "settings", label: "Settings", Icon: SettingsIcon },
];

export default function TabBar({
  active = "studio",
  onChange,
}: {
  active?: TabKey;
  onChange?: (k: TabKey) => void;
}) {
  return (
    <View style={styles.wrap}>
      {TABS.map(({ key, label, Icon }) => (
        <PressableScale key={key} onPress={() => onChange?.(key)} style={styles.cell} scaleTo={0.9}>
          <Icon size={20} color={active === key ? COLORS.white : COLORS.white80} />
          <Text style={[styles.label, active === key ? styles.labelActive : null]}>{label}</Text>
        </PressableScale>
      ))}
      <GlassEdge radius={34} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 34, overflow: "hidden",
    ...panelSurface,
  },
  cell: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  label: { fontFamily: FONT.sfRegular, fontSize: 10, color: COLORS.white80, textAlign: "center" },
  labelActive: { color: COLORS.white },
});
