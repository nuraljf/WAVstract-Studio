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
import { LoadingVeil, ErrorVeil } from "./LoadingBars";
import { COLORS, FONT, panelSurface } from "./theme";

const MIN_Z = 1;
const MAX_Z = 5;

// The background picker input lives in the DOM and is module-retained for the
// sheet's whole life — iOS Safari GCs a detached input before `change` fires
// (the WAV-22 lesson; this is why the picked photo never appeared, WAV-38).
let bgInput: HTMLInputElement | null = null;

export function DevTools({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [inspect, setInspect] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [bg, setBg] = useState<string | null>(null);
  // state-preview veils (WAV-40): overlay the production loading / error
  // components on whatever page is showing, for 1:1 Figma comparison
  const [veil, setVeil] = useState<"none" | "loading" | "error">("none");

  const scale = useSharedValue(1);
  const panX = useSharedValue(0);
  const panY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const rootRef = useRef<any>(null);

  // swap (or clear) the dev background, releasing the previous object URL
  const setBackground = (url: string | null) => {
    setBg((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  };

  // The DEV chip can sit over whatever is being tested — hold it still for 1s
  // and it becomes draggable, carrying the whole control cluster (WAV-38/48).
  // Plain DOM pointer events: RNGH's activateAfterLongPress never activates on
  // web, which is why the first version couldn't be dragged anywhere.
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const grabbed = useSharedValue(0);
  const lastDragAt = useRef(0);
  const devLayerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dragX.value }, { translateY: dragY.value }],
  }));
  const chipStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + grabbed.value * 0.08 }],
    opacity: 1 - grabbed.value * 0.15,
  }));
  const toggleOpen = () => {
    if (Date.now() - lastDragAt.current < 350) return; // drag release, not a tap
    setOpen((o) => !o);
  };
  // pointerdown arrives via a React prop on a real <div> (a View ref isn't a
  // reliable addEventListener target); move/up ride window-level listeners so
  // the drag never loses the pointer.
  const chipDown = React.useMemo(() => {
    const st = { timer: 0, dragging: false, sx: 0, sy: 0, bx: 0, by: 0 };
    const move = (e: PointerEvent) => {
      if (!st.dragging) {
        // moved away before the hold completed — it's a tap, not a grab
        if (Math.hypot(e.clientX - st.sx, e.clientY - st.sy) > 8) window.clearTimeout(st.timer);
        return;
      }
      dragX.value = st.bx + (e.clientX - st.sx);
      dragY.value = st.by + (e.clientY - st.sy);
    };
    const up = () => {
      window.clearTimeout(st.timer);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      if (st.dragging) {
        st.dragging = false;
        lastDragAt.current = Date.now(); // swallow the release click
        grabbed.value = withTiming(0, { duration: 140 });
      }
    };
    return (e: { clientX: number; clientY: number }) => {
      st.sx = e.clientX;
      st.sy = e.clientY;
      st.bx = dragX.value;
      st.by = dragY.value;
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
      st.timer = window.setTimeout(() => {
        st.dragging = true;
        grabbed.value = withTiming(1, { duration: 140 });
      }, 1000);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    bgInput?.remove();
    const input = document.createElement("input");
    bgInput = input;
    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";
    const cleanup = () => {
      input.remove();
      if (bgInput === input) bgInput = null;
    };
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) setBackground(URL.createObjectURL(file));
      cleanup();
    };
    document.body.appendChild(input);
    input.click();
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

      {/* state-preview veils — the EXACT production components, above the page
          and below the dev controls so they can always be toggled back off */}
      {veil !== "none" && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {veil === "loading" ? <LoadingVeil /> : <ErrorVeil />}
        </View>
      )}

      {/* fixed dev controls (not zoomed; draggable via 1s hold on the chip) */}
      <Animated.View style={[styles.devLayer, devLayerStyle]} pointerEvents="box-none">
        <Animated.View style={chipStyle}>
          {/* real <div>: guaranteed pointer events; touchAction none keeps iOS
              from turning the 1s hold into a scroll */}
          {Platform.OS === "web" ? (
            React.createElement(
              "div",
              { onPointerDown: chipDown, style: { touchAction: "none" } },
              <Pressable onPress={toggleOpen} style={styles.devToggle}>
                <Text style={styles.devToggleText}>{open ? "✕" : "DEV"}</Text>
                <GlassEdge radius={16} />
              </Pressable>,
            )
          ) : (
            <Pressable onPress={toggleOpen} style={styles.devToggle}>
              <Text style={styles.devToggleText}>{open ? "✕" : "DEV"}</Text>
              <GlassEdge radius={16} />
            </Pressable>
          )}
        </Animated.View>

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
              <DevBtn label="Clear" onPress={() => setBackground(null)} />
            </View>

            {/* overlay the universal states on the live page (WAV-40) */}
            <View style={styles.btnRow}>
              <DevBtn
                label="Loading"
                active={veil === "loading"}
                onPress={() => setVeil((v) => (v === "loading" ? "none" : "loading"))}
                wide
              />
              <DevBtn
                label="Error"
                active={veil === "error"}
                onPress={() => setVeil((v) => (v === "error" ? "none" : "error"))}
                wide
              />
            </View>
            <Text style={styles.hint}>
              {Platform.OS === "web"
                ? "Zoom in, then scroll to pan • Ctrl/⌘+scroll zooms to cursor • hold DEV 1s to drag it"
                : inspect
                  ? "Drag to pan • pinch to zoom (UI paused)"
                  : "Turn Inspect on to pan/zoom"}
            </Text>

            <GlassEdge radius={16} />
          </View>
        ) : null}
      </Animated.View>
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
