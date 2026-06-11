// Settings tab, 1:1 from Figma 239:2208. The user card + sign out are wired;
// Display name / Downloads / Feedback are design-only for now (per the design's
// own "don't add logic yet" notes) — they still press-animate like everything.
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { GlassEdge } from "./Glass";
import { PressableScale } from "./PressableScale";
import {
  UserGlyphIcon, DisplayNameIcon, DownloadsCloudIcon, FeedbackIcon,
  SignOutIcon, ChevronRightIcon,
} from "./icons";
import { COLORS, FONT, panelSurface, dangerSurface, accentSurface } from "./theme";
import { useAuth } from "../../lib/use-auth";

function displayNameOf(meta: Record<string, unknown> | undefined, email: string | null): string {
  const m = meta ?? {};
  const name = (m["full_name"] ?? m["name"] ?? m["user_name"]) as string | undefined;
  if (name) return name;
  if (email) return email.split("@")[0];
  return "Guest";
}

export default function SettingsScreen() {
  const { session, guest, signOut } = useAuth();
  const email = session?.user.email ?? null;
  const name = displayNameOf(session?.user.user_metadata, email);

  return (
    <View style={styles.wrap}>
      {/* user card */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <UserGlyphIcon size={30} />
        </View>
        <View>
          <Text style={styles.userName}>{name}</Text>
          <Text style={styles.userEmail}>{email ?? (guest ? "Local-only — sign in to sync" : "")}</Text>
        </View>
        <GlassEdge radius={20} />
      </View>

      {/* inert rows (design-only for now) — they still animate on press */}
      <PressableScale style={styles.row}>
        <DisplayNameIcon size={24} />
        <Text style={styles.rowLabel}>Display name</Text>
        <View style={styles.rowTail}>
          <Text style={styles.rowValue}>{name}</Text>
        </View>
      </PressableScale>

      <PressableScale style={styles.row}>
        <DownloadsCloudIcon size={24} />
        <Text style={styles.rowLabel}>Downloads</Text>
        <View style={styles.rowTail}>
          <ChevronRightIcon size={24} />
        </View>
      </PressableScale>

      <PressableScale style={styles.row}>
        <FeedbackIcon size={24} />
        <Text style={styles.rowLabel}>Feedback</Text>
        <View style={styles.rowTail}>
          <ChevronRightIcon size={24} />
        </View>
      </PressableScale>

      {/* sign out (signed in) / sign in (guest) */}
      <PressableScale onPress={() => void signOut()} style={[styles.actionBtn, guest ? styles.signInBtn : styles.signOutBtn]}>
        <SignOutIcon size={24} />
        <Text style={styles.actionLabel}>{guest ? "Sign in" : "Sign out"}</Text>
        <GlassEdge radius={16} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", gap: 10 },

  userCard: {
    width: "100%", flexDirection: "row", alignItems: "center", gap: 10,
    padding: 10, borderRadius: 20, overflow: "hidden",
    ...panelSurface,
  },
  avatar: {
    width: 50, height: 50, borderRadius: 16,
    backgroundColor: COLORS.white,
    alignItems: "center", justifyContent: "center",
  },
  userName: { fontFamily: FONT.geistMedium, fontSize: 16, color: COLORS.white },
  userEmail: { fontFamily: FONT.geistMedium, fontSize: 12, color: COLORS.white80 },

  row: {
    width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingHorizontal: 20, paddingVertical: 16, borderRadius: 16,
  },
  rowLabel: { fontFamily: FONT.geistMedium, fontSize: 16, color: COLORS.white, textAlign: "center" },
  rowTail: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", justifyContent: "flex-end" },
  rowValue: { fontFamily: FONT.geistMedium, fontSize: 12, color: COLORS.white80, textAlign: "center" },

  actionBtn: {
    width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingHorizontal: 20, paddingVertical: 16, borderRadius: 16, overflow: "hidden",
  },
  signOutBtn: { ...dangerSurface },
  signInBtn: { ...accentSurface },
  actionLabel: { fontFamily: FONT.geistMedium, fontSize: 16, color: COLORS.white, textAlign: "center" },
});
