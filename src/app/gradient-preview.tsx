// TEMP gallery route for AmbientGradientTemplates — not linked from the app,
// reachable only by URL: http://localhost:8082/gradient-preview
// Pick a template here, then delete this file (nothing imports it).
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { GRADIENT_TEMPLATES } from "../components/studio/AmbientGradientTemplates";

const web = Platform.OS === "web";

// busy warm backdrop to prove the glows stay fully transparent around themselves
const photoBg = (
  web
    ? {
        backgroundImage:
          "linear-gradient(130deg, #4a2e15 0%, #7a4a1f 22%, #1f4a3a 48%, #15304a 72%, #3a1f4a 100%)",
      }
    : { backgroundColor: "#2a2a2a" }
) as object;

export default function GradientPreviewScreen() {
  const [idx, setIdx] = React.useState(0);
  const [anchor, setAnchor] = React.useState<"bottom" | "top">("bottom");
  const [live, setLive] = React.useState(true);
  const [photo, setPhoto] = React.useState(false);
  const tpl = GRADIENT_TEMPLATES[idx];

  return (
    <View style={[styles.root, photo && photoBg]}>
      <tpl.Component key={tpl.key} reactive={live} playing={live} anchor={anchor} />
      <View style={styles.panel} pointerEvents="box-none">
        <View style={styles.rowWrap}>
          {GRADIENT_TEMPLATES.map((t, i) => (
            <Pressable
              key={t.key}
              testID={`tpl-${t.key}`}
              onPress={() => setIdx(i)}
              style={[styles.chip, i === idx && styles.chipOn]}
            >
              <Text style={[styles.chipTxt, i === idx && styles.chipTxtOn]}>{t.name}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.rowWrap}>
          <Pressable
            testID="toggle-anchor"
            onPress={() => setAnchor((a) => (a === "bottom" ? "top" : "bottom"))}
            style={styles.chip}
          >
            <Text style={styles.chipTxt}>anchor: {anchor}</Text>
          </Pressable>
          <Pressable testID="toggle-live" onPress={() => setLive((v) => !v)} style={styles.chip}>
            <Text style={styles.chipTxt}>{live ? "live (synthetic levels)" : "ambient only"}</Text>
          </Pressable>
          <Pressable testID="toggle-bg" onPress={() => setPhoto((v) => !v)} style={styles.chip}>
            <Text style={styles.chipTxt}>bg: {photo ? "photo" : "dark"}</Text>
          </Pressable>
        </View>
        <Text style={styles.caption}>
          key: {tpl.key} · {tpl.Component.name}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#050505" },
  panel: {
    position: "absolute", left: 0, right: 0, top: 0, bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.14)",
  },
  chipOn: {
    backgroundColor: "rgba(26,98,255,0.32)",
    borderColor: "rgba(26,98,255,0.8)",
  },
  chipTxt: {
    color: "rgba(255,255,255,0.75)",
    fontFamily: "Geist_500Medium",
    fontSize: 13,
  },
  chipTxtOn: { color: "#fff" },
  caption: {
    color: "rgba(255,255,255,0.45)",
    fontFamily: "Geist_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
});
