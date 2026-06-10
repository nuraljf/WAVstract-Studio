// Studio state (WAV-16 Phase 1). Holds the extracted sounds and drives the
// single shared audio Player. Components read from here via useStudio().
//
// Model:
//   - sounds[]    : every extracted clip (peaks + cover + decoded buffer)
//   - activeId    : whose buffer is currently loaded in the Player
//   - timelineId  : which sound the Timeline card shows (set by the row "+")
//   - position    : live playback head (seconds), updated each animation frame
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
  source: PlayableSource; // decoded PCM buffer, or a media-element fallback
};

const DEFAULT_SPEED = 1.0;

type StudioState = {
  sounds: Sound[];
  activeId: string | null;
  timelineId: string | null;
  isPlaying: boolean;
  position: number;
  speed: number;
  supported: boolean;
  timelineSound: Sound | null;
  activeSound: Sound | null;
  extract: () => void;
  togglePlay: (id: string) => void;
  addToTimeline: (id: string) => void;
  seek: (t: number) => void;
  setSpeed: (v: number) => void;
};

const StudioContext = createContext<StudioState | null>(null);

let idCounter = 0;
const nextId = () => `snd_${Date.now()}_${idCounter++}`;

function baseName(filename: string): string {
  return filename.replace(/\.[^./\\]+$/, "");
}

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [timelineId, setTimelineId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [speed, setSpeedState] = useState(DEFAULT_SPEED);

  const rafRef = useRef<number | null>(null);

  // ---- rAF position ticker (runs only while playing) ----
  const stopTicker = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startTicker = useCallback(() => {
    stopTicker();
    const tick = () => {
      setPosition(player.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [stopTicker]);

  useEffect(() => {
    // natural end → reset to stopped at 0
    player.onEnded = () => {
      setIsPlaying(false);
      setPosition(0);
      stopTicker();
    };
    return () => {
      player.onEnded = null;
      stopTicker();
    };
  }, [stopTicker]);

  // ---- actions ----
  const extract = useCallback(() => {
    if (!isAudioSupported || typeof document === "undefined") return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "audio/*,video/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
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
      }
    };
    input.click();
  }, []);

  const togglePlay = useCallback(
    (id: string) => {
      const sound = sounds.find((s) => s.id === id);
      if (!sound) return;
      if (activeId === id) {
        player.toggle();
      } else {
        player.setRate(speed);
        player.load(sound.source);
        player.play(0);
        setActiveId(id);
      }
      const nowPlaying = player.isPlaying;
      setIsPlaying(nowPlaying);
      if (nowPlaying) startTicker();
      else stopTicker();
    },
    [sounds, activeId, speed, startTicker, stopTicker],
  );

  const addToTimeline = useCallback((id: string) => {
    // Pure pointer change — if this sound is the one currently playing, the
    // Player is untouched, so there's zero audio cut.
    setTimelineId(id);
  }, []);

  const seek = useCallback(
    (t: number) => {
      player.seek(t);
      setPosition(player.currentTime);
    },
    [],
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
      speed,
      supported: isAudioSupported,
      timelineSound,
      activeSound,
      extract,
      togglePlay,
      addToTimeline,
      seek,
      setSpeed,
    }),
    [
      sounds, activeId, timelineId, isPlaying, position, speed,
      timelineSound, activeSound, extract, togglePlay, addToTimeline, seek, setSpeed,
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
