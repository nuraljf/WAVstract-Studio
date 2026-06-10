// TEMPORARY dev-only inspector overlay (WAV-14). Remove before release.
//   - top-left glass control opens a panel
//   - magnify: zoom 1x–5x (+/- or pinch on native) and drag to pan while
//     "Inspect" is on (UI interaction is suspended so you can pan freely)
//   - background: upload an image that renders behind the UI to evaluate the
//     liquid-glass surfaces over real content
import React, { useState, useRef, useEffect } from "react";
import { View, Text, Image, Pressable, Platform, StyleSheet } from "react-native";
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { GlassEdge } from "./Glass";
import { COLORS, FONT, panelSurface } from "./theme";

const MIN_Z = 1;
const MAX_Z = 5;

export function DevTools({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [inspect, setInspect] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [bg, setBg] = useState<string | null>(null);

  const scale = useSharedValue(1);
  const panX = useSharedValue(0);
  const panY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const rootRef = useRef<any>(null);

  // Keep panning within bounds so zoomed content can't be scrolled off-screen.
  const clampPan = (z: number) => {
    const r = rootRef.current?.getBoundingClientRect?.();
    if (!r) return;
    const maxX = ((z - 1) * r.width) / 2;
    const maxY = ((z - 1) * r.height) / 2;
    panX.value = Math.min(Math.max(panX.value, -maxX), maxX);
    panY.value = Math.min(Math.max(panY.value, -maxY), maxY);
  };

  // Zoom toward a screen point (cursor) instead of always to the middle (WAV-19).
  const zoomAt = (next: number, clientX: number, clientY: number) => {
    const z = Math.min(Math.max(next, MIN_Z), MAX_Z);
    const r = rootRef.current?.getBoundingClientRect?.();
    if (r && scale.value > 0) {
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const k = 1 - z / scale.value;
      panX.value = panX.value + (clientX - cx - panX.value) * k;
      panY.value = panY.value + (clientY - cy - panY.value) * k;
    }
    scale.value = z;
    setZoom(z);
    if (z === 1) {
      panX.value = 0;
      panY.value = 0;
    } else {
      clampPan(z);
    }
  };

  // Web: scrollwheel pans when zoomed; Ctrl/⌘+wheel zooms toward the cursor.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const el = rootRef.current;
    if (!el?.addEventListener) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        zoomAt(scale.value * (e.deltaY < 0 ? 1.08 : 1 / 1.08), e.clientX, e.clientY);
        return;
      }
      if (scale.value <= 1.001) return; // not zoomed → let the app scroll normally
      e.preventDefault();
      panX.value -= e.deltaX;
      panY.value -= e.deltaY;
      clampPan(scale.value);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyZoom = (z: number) => {
    const next = Math.min(Math.max(z, MIN_Z), MAX_Z);
    setZoom(next);
    scale.value = withTiming(next, { duration: 180 });
    if (next === 1) {
      panX.value = withTiming(0);
      panY.value = withTiming(0);
    }
  };

  const reset = () => {
    setZoom(1);
    scale.value = withTiming(1);
    panX.value = withTiming(0);
    panY.value = withTiming(0);
  };

  const pickBackground = () => {
    if (Platform.OS === "web") {
      const doc: any = (globalThis as any).document;
      const input = doc.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) setBg(URL.createObjectURL(file));
      };
      input.click();
    } else {
      // Native: wire up expo-image-picker here when needed.
    }
  };

  const pan = Gesture.Pan()
    .enabled(inspect)
    .onBegin(() => {
      startX.value = panX.value;
      startY.value = panY.value;
    })
    .onUpdate((e) => {
      panX.value = startX.value + e.translationX;
      panY.value = startY.value + e.translationY;
    });

  const pinch = Gesture.Pinch()
    .enabled(inspect)
    .onChange((e) => {
      const next = Math.min(Math.max(scale.value * e.scaleChange, MIN_Z), MAX_Z);
      scale.value = next;
    });

  const gesture = Gesture.Simultaneous(pan, pinch);

  const contentStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: panX.value },
      { translateY: panY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View ref={rootRef} style={styles.root}>
      {bg ? <Image source={{ uri: bg }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}

      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.content, contentStyle]} pointerEvents={inspect ? "none" : "auto"}>
          {children}
        </Animated.View>
      </GestureDetector>

      {/* fixed dev controls (not zoomed) */}
      <View style={styles.devLayer} pointerEvents="box-none">
        <Pressable onPress={() => setOpen((o) => !o)} style={styles.devToggle}>
          <Text style={styles.devToggleText}>{open ? "✕" : "DEV"}</Text>
          <GlassEdge radius={16} />
        </Pressable>

        {open ? (
          <View style={styles.panel}>
            <Text style={styles.row}>Zoom {zoom.toFixed(1)}x</Text>
            <View style={styles.btnRow}>
              <DevBtn label="–" onPress={() => applyZoom(zoom - 0.5)} />
              <DevBtn label="+" onPress={() => applyZoom(zoom + 0.5)} />
              <DevBtn label="Reset" onPress={reset} wide />
            </View>

            <DevBtn
              label={inspect ? "Inspect: ON" : "Inspect: OFF"}
              onPress={() => setInspect((v) => !v)}
              active={inspect}
              full
            />

            <View style={styles.btnRow}>
              <DevBtn label="Background" onPress={pickBackground} wide />
              <DevBtn label="Clear" onPress={() => setBg(null)} />
            </View>
            <Text style={styles.hint}>
              {Platform.OS === "web"
                ? "Zoom in, then scroll to pan • Ctrl/⌘+scroll zooms to cursor"
                : inspect
                  ? "Drag to pan • pinch to zoom (UI paused)"
                  : "Turn Inspect on to pan/zoom"}
            </Text>

            <GlassEdge radius={16} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function DevBtn({
  label, onPress, active, wide, full,
}: { label: string; onPress: () => void; active?: boolean; wide?: boolean; full?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.devBtn, wide && styles.devBtnWide, full && styles.devBtnFull, active && styles.devBtnActive]}
    >
      <Text style={styles.devBtnText}>{label}</Text>
      <GlassEdge radius={12} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: "hidden" },
  content: { flex: 1 },

  devLayer: { position: "absolute", top: 50, left: 16, alignItems: "flex-start", gap: 8 },
  devToggle: {
    minWidth: 44, height: 36, paddingHorizontal: 12,
    borderRadius: 16, alignItems: "center", justifyContent: "center",
    overflow: "hidden", ...panelSurface,
  },
  devToggleText: { fontFamily: FONT.geistSemibold, fontSize: 12, color: COLORS.white },

  panel: {
    width: 220, padding: 12, gap: 8, borderRadius: 16,
    overflow: "hidden", ...panelSurface,
  },
  row: { fontFamily: FONT.geistMedium, fontSize: 13, color: COLORS.white },
  hint: { fontFamily: FONT.geistRegular, fontSize: 11, color: COLORS.white80 },
  btnRow: { flexDirection: "row", gap: 8, alignItems: "center" },

  devBtn: {
    minWidth: 40, height: 34, paddingHorizontal: 10,
    borderRadius: 12, alignItems: "center", justifyContent: "center",
    overflow: "hidden", ...panelSurface,
  },
  devBtnWide: { flex: 1 },
  devBtnFull: { width: "100%" },
  devBtnActive: { backgroundColor: COLORS.accent },
  devBtnText: { fontFamily: FONT.geistMedium, fontSize: 13, color: COLORS.white },
});
