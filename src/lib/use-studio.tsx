// Studio state (WAV-16 Phase 1). Holds the extracted sounds and drives the
// single shared audio Player. Components read from here via useStudio().
//
// Model:
//   - sounds[]    : every extracted clip (peaks + cover + decoded buffer)
//   - activeId    : whose buffer is currently loaded in the Player
//   - timelineId  : which sound the Timeline card shows (set by the row "+")
//   - positionSV  : live playback head (seconds) as a Reanimated shared value —
//                   updated every frame WITHOUT a React render (WAV-22 perf)
//   - position    : the same head as React state, updated only when the
//                   displayed second changes (drives the mm:ss text at ~1 Hz)
//
// Because the list preview and the timeline share one Player, pressing "+" on a
// playing row just points the timeline at it — no reload, no audio cut.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";
import { useSharedValue, type SharedValue } from "react-native-reanimated";
import {
  extractAudio,
  extractCover,
  isAudioSupported,
  player,
  type PlayableSource,
} from "./audio-engine";

export type Sound = {
  id: string;
  name: string;
  peaks: number[];
  duration: number;
  cover: string | null; // data URL (video first frame) or null → music glyph
  favorite: boolean; // heart action in the row's editing state (WAV-24)
  source: PlayableSource; // decoded PCM buffer, or a media-element fallback
};

const DEFAULT_SPEED = 1.0;

type StudioState = {
  sounds: Sound[];
  activeId: string | null;
  timelineId: string | null;
  isPlaying: boolean;
  position: number;
  positionSV: SharedValue<number>;
  speed: number;
  supported: boolean;
  timelineSound: Sound | null;
  activeSound: Sound | null;
  extract: () => void;
  togglePlay: (id: string) => void;
  addToTimeline: (id: string) => void;
  removeSound: (id: string) => void;
  toggleFavorite: (id: string) => void;
  seek: (t: number) => void;
  setSpeed: (v: number) => void;
};

const StudioContext = createContext<StudioState | null>(null);

let idCounter = 0;
const nextId = () => `snd_${Date.now()}_${idCounter++}`;

function baseName(filename: string): string {
  return filename.replace(/\.[^./\\]+$/, "");
}

// iOS Safari can garbage-collect a detached <input type=file> while the picker
// sheet is still open — `change` then never fires and the row never appears
// (the 50/50 add bug, WAV-22). Keeping the input referenced AND in the DOM for
// the picker's whole life makes the callback reliable.
let fileInput: HTMLInputElement | null = null;

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [timelineId, setTimelineId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [speed, setSpeedState] = useState(DEFAULT_SPEED);

  const positionSV = useSharedValue(0);
  const rafRef = useRef<number | null>(null);
  const lastSecRef = useRef(-1);
  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = activeId;

  // Push a position into BOTH the shared value (smooth visuals) and React
  // state (text). Used for discrete jumps: seek / pause / end / track switch.
  const syncPosition = useCallback(
    (t: number) => {
      positionSV.value = t;
      lastSecRef.current = Math.floor(t);
      setPosition(t);
    },
    [positionSV],
  );

  // ---- rAF position ticker (runs only while playing) ----
  // Per frame it only writes the shared value (no render). React state is
  // touched once per second, when the visible mm:ss actually changes.
  const stopTicker = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startTicker = useCallback(() => {
    stopTicker();
    const tick = () => {
      const t = player.currentTime;
      positionSV.value = t;
      const sec = Math.floor(t);
      if (sec !== lastSecRef.current) {
        lastSecRef.current = sec;
        setPosition(t);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [stopTicker, positionSV]);

  useEffect(() => {
    // natural end → reset to stopped at 0
    player.onEnded = () => {
      setIsPlaying(false);
      syncPosition(0);
      stopTicker();
    };
    // element files report their REAL duration late (and the upfront probe can
    // be wrong on iOS) — adopt it on the active sound so the timeline, the
    // playhead and the audio all end together (WAV-22).
    player.onDuration = (d) => {
      const id = activeIdRef.current;
      if (!id) return;
      setSounds((prev) =>
        prev.map((s) =>
          s.id === id && Math.abs(s.duration - d) > 0.05 ? { ...s, duration: d } : s,
        ),
      );
    };
    return () => {
      player.onEnded = null;
      player.onDuration = null;
      stopTicker();
    };
  }, [stopTicker, syncPosition]);

  // ---- actions ----
  const extract = useCallback(() => {
    if (!isAudioSupported || typeof document === "undefined") return;
    fileInput?.remove();
    const input = document.createElement("input");
    fileInput = input;
    input.type = "file";
    input.accept = "audio/*,video/*";
    input.style.display = "none";
    const cleanup = () => {
      input.remove();
      if (fileInput === input) fileInput = null;
    };
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return cleanup();
      try {
        // Add the row as soon as the audio is ready. Cover art is resolved
        // separately and patched in — a slow/failed thumbnail (common on iOS)
        // must never block the upload from appearing (WAV-16 follow-up).
        const id = nextId();
        const { source, duration, peaks } = await extractAudio(file);
        const sound: Sound = {
          id,
          name: baseName(file.name),
          peaks,
          duration,
          cover: null,
          favorite: false,
          source,
        };
        // WAV-17: extraction only adds the row in its UNSELECTED state — it
        // does not start playing. Playback begins when the user presses the row.
        setSounds((prev) => [sound, ...prev]);

        extractCover(file)
          .then((cover) => {
            if (!cover) return;
            setSounds((prev) => prev.map((s) => (s.id === id ? { ...s, cover } : s)));
          })
          .catch(() => {});
      } catch (err) {
        console.error("[studio] decode failed", err);
      } finally {
        cleanup();
      }
    };
    document.body.appendChild(input);
    input.click();
  }, []);

  const togglePlay = useCallback(
    (id: string) => {
      const sound = sounds.find((s) => s.id === id);
      if (!sound) return;
      if (activeId === id) {
        player.toggle();
        if (!player.isPlaying) syncPosition(player.currentTime);
      } else {
        player.setRate(speed);
        player.load(sound.source);
        player.play(0);
        setActiveId(id);
        syncPosition(0);
      }
      const nowPlaying = player.isPlaying;
      setIsPlaying(nowPlaying);
      if (nowPlaying) startTicker();
      else stopTicker();
    },
    [sounds, activeId, speed, startTicker, stopTicker, syncPosition],
  );

  const addToTimeline = useCallback((id: string) => {
    // Pure pointer change — if this sound is the one currently playing, the
    // Player is untouched, so there's zero audio cut.
    setTimelineId(id);
  }, []);

  const removeSound = useCallback(
    (id: string) => {
      setSounds((prev) => {
        const snd = prev.find((s) => s.id === id);
        // element sources keep the picked file alive via an object URL — this
        // row is gone for good, so release it.
        if (snd?.source.kind === "element") URL.revokeObjectURL(snd.source.url);
        return prev.filter((s) => s.id !== id);
      });
      setTimelineId((t) => (t === id ? null : t));
      if (activeIdRef.current === id) {
        player.unload();
        setActiveId(null);
        setIsPlaying(false);
        syncPosition(0);
        stopTicker();
      }
    },
    [stopTicker, syncPosition],
  );

  const toggleFavorite = useCallback((id: string) => {
    setSounds((prev) => prev.map((s) => (s.id === id ? { ...s, favorite: !s.favorite } : s)));
  }, []);

  const seek = useCallback(
    (t: number) => {
      player.seek(t);
      syncPosition(player.currentTime);
    },
    [syncPosition],
  );

  const setSpeed = useCallback((v: number) => {
    player.setRate(v);
    setSpeedState(v);
  }, []);

  const activeSound = useMemo(
    () => sounds.find((s) => s.id === activeId) ?? null,
    [sounds, activeId],
  );
  const timelineSound = useMemo(
    () => sounds.find((s) => s.id === timelineId) ?? null,
    [sounds, timelineId],
  );

  const value = useMemo<StudioState>(
    () => ({
      sounds,
      activeId,
      timelineId,
      isPlaying,
      position,
      positionSV,
      speed,
      supported: isAudioSupported,
      timelineSound,
      activeSound,
      extract,
      togglePlay,
      addToTimeline,
      removeSound,
      toggleFavorite,
      seek,
      setSpeed,
    }),
    [
      sounds, activeId, timelineId, isPlaying, position, positionSV, speed,
      timelineSound, activeSound, extract, togglePlay, addToTimeline,
      removeSound, toggleFavorite, seek, setSpeed,
    ],
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio(): StudioState {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error("useStudio must be used inside <StudioProvider>");
  return ctx;
}

/** mm:ss formatter for the timeline labels. */
export function fmtTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Keep the Platform import meaningful for native (no-op extract path above).
export const STUDIO_NATIVE = Platform.OS !== "web";
