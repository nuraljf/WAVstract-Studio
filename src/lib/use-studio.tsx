// Studio state (WAV-16 Phase 1, WAV-27 cloud library). Holds the extracted
// sounds and drives the single shared audio Player. Components read from here
// via useStudio().
//
// Model:
//   - sounds[]    : every clip in the table. `source` is null for cloud rows
//                   whose audio hasn't been downloaded to this device yet.
//   - sync        : per-row lifecycle — local (guest), uploading, synced,
//                   failed (tap to retry), downloading (first play on device)
//   - activeId    : whose audio is currently loaded in the Player
//   - timelineId  : which sound the Timeline card shows (set by the row "+")
//   - positionSV  : live playback head (seconds) as a Reanimated shared value —
//                   updated every frame WITHOUT a React render (WAV-22 perf)
//   - position    : the same head as React state, updated only when the
//                   displayed second changes (drives the mm:ss text at ~1 Hz)
//
// Cloud flow (signed in): extract → row appears instantly (uploading) → file
// uploads to the private bucket + metadata row inserts → synced. On any other
// device the metadata list loads instantly; audio bytes download lazily on the
// first play. Favorite/delete mirror to the cloud. Guests stay fully local.

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
  sourceFromBlob,
  type PlayableSource,
} from "./audio-engine";
import { useAuth } from "./use-auth";
import * as cloud from "./cloud";

export type SyncState = "local" | "uploading" | "synced" | "failed" | "downloading";

export type Sound = {
  id: string;
  name: string;
  peaks: number[];
  duration: number;
  cover: string | null; // data URL (video first frame) or null → music glyph
  favorite: boolean; // heart action in the row's editing state (WAV-24)
  source: PlayableSource | null; // null = cloud row not downloaded yet
  sync: SyncState;
  cloudId?: string; // db row uuid once synced
  filePath?: string; // storage object path once synced
  mime?: string | null;
  file?: File; // kept while uploading/failed so retry can re-send
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
  cloudLoading: boolean; // first library fetch after sign-in
  timelineSound: Sound | null;
  activeSound: Sound | null;
  extract: () => void;
  togglePlay: (id: string, keepPosition?: boolean) => void;
  addToTimeline: (id: string) => void;
  removeSound: (id: string) => void;
  toggleFavorite: (id: string) => void;
  retryUpload: (id: string) => void;
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
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  const [sounds, setSounds] = useState<Sound[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [timelineId, setTimelineId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [speed, setSpeedState] = useState(DEFAULT_SPEED);
  const [cloudLoading, setCloudLoading] = useState(false);

  const positionSV = useSharedValue(0);
  const rafRef = useRef<number | null>(null);
  const lastSecRef = useRef(-1);
  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = activeId;
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = userId;

  const patchSound = useCallback((id: string, patch: Partial<Sound>) => {
    setSounds((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

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

  const resetPlayback = useCallback(() => {
    player.unload();
    setActiveId(null);
    setIsPlaying(false);
    syncPosition(0);
    stopTicker();
  }, [stopTicker, syncPosition]);

  useEffect(() => {
    // natural end → loop: restart from 0 and keep going (element sources loop
    // natively; this handles decoded-buffer sources)
    player.onEnded = () => {
      player.play(0);
      syncPosition(0);
      setIsPlaying(true);
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
    // Background analysis of an element/video source finished (WAV-33) — swap
    // the synthetic sparkline for the file's REAL waveform wherever it shows.
    player.onPeaks = (url, peaks) => {
      setSounds((prev) =>
        prev.map((s) =>
          s.source?.kind === "element" && s.source.url === url ? { ...s, peaks } : s,
        ),
      );
    };
    return () => {
      player.onEnded = null;
      player.onDuration = null;
      player.onPeaks = null;
      stopTicker();
    };
  }, [stopTicker, syncPosition]);

  // ---- cloud library: load on sign-in, clear on sign-out ----
  useEffect(() => {
    if (!userId) {
      // Signed out (or guest): the account library leaves with the account.
      setSounds((prev) => {
        prev.forEach((s) => {
          if (s.source?.kind === "element") URL.revokeObjectURL(s.source.url);
        });
        return [];
      });
      setTimelineId(null);
      resetPlayback();
      return;
    }
    let cancelled = false;
    setCloudLoading(true);
    cloud
      .listSounds()
      .then((rows) => {
        if (cancelled) return;
        setSounds((prev) => {
          const known = new Set(prev.map((s) => s.cloudId).filter(Boolean));
          const fetched: Sound[] = rows
            .filter((r) => !known.has(r.id))
            .map((r) => ({
              id: `cloud_${r.id}`,
              name: r.name,
              peaks: Array.isArray(r.peaks) ? (r.peaks as number[]) : [],
              duration: r.duration,
              cover: r.cover,
              favorite: r.favorite,
              source: null, // bytes download lazily on first play
              sync: "synced",
              cloudId: r.id,
              filePath: r.file_path,
              mime: r.mime,
            }));
          return [...prev, ...fetched];
        });
      })
      .catch((err) => console.error("[studio] cloud list failed", err))
      .finally(() => !cancelled && setCloudLoading(false));
    return () => {
      cancelled = true;
    };
  }, [userId, resetPlayback]);

  // ---- background upload (signed-in extracts + retries) ----
  const uploadInBackground = useCallback(
    (id: string, snd: Pick<Sound, "name" | "duration" | "peaks" | "cover" | "favorite">, file: File) => {
      const uid = userIdRef.current;
      if (!uid) return;
      patchSound(id, { sync: "uploading" });
      cloud
        .uploadSound({
          userId: uid,
          file,
          mime: file.type || "application/octet-stream",
          name: snd.name,
          duration: snd.duration,
          peaks: snd.peaks,
          cover: snd.cover,
          favorite: snd.favorite,
        })
        .then((row) => {
          patchSound(id, {
            sync: "synced",
            cloudId: row.id,
            filePath: row.file_path,
            mime: row.mime,
            file: undefined,
          });
        })
        .catch((err) => {
          console.error("[studio] upload failed", err);
          patchSound(id, { sync: "failed" });
        });
    },
    [patchSound],
  );

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
        const signedIn = !!userIdRef.current;
        const sound: Sound = {
          id,
          name: baseName(file.name),
          peaks,
          duration,
          cover: null,
          favorite: false,
          source,
          sync: signedIn ? "uploading" : "local",
          mime: file.type || null,
          file: signedIn ? file : undefined,
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

        if (signedIn) {
          // Cover may not be ready yet — upload metadata with what we have;
          // the row cover is local-first anyway. (Cover lands next upload.)
          uploadInBackground(id, sound, file);
        }
      } catch (err) {
        console.error("[studio] decode failed", err);
      } finally {
        cleanup();
      }
    };
    document.body.appendChild(input);
    input.click();
  }, [uploadInBackground]);

  const retryUpload = useCallback(
    (id: string) => {
      setSounds((prev) => {
        const snd = prev.find((s) => s.id === id);
        if (snd?.file && snd.sync === "failed") {
          uploadInBackground(id, snd, snd.file);
        }
        return prev;
      });
    },
    [uploadInBackground],
  );

  // Switching to a different sound resets the speed slider to 1.0x — each
  // track starts at its natural speed/pitch.
  const resetSpeed = useCallback(() => {
    player.setRate(1);
    setSpeedState(1);
  }, []);

  const playLoaded = useCallback(
    (id: string, source: PlayableSource) => {
      resetSpeed();
      player.load(source);
      player.play(0);
      setActiveId(id);
      syncPosition(0);
      setIsPlaying(true);
      startTicker();
    },
    [startTicker, syncPosition, resetSpeed],
  );

  // keepPosition: the TIMELINE pauses in place; the TABLE treats a pause as
  // "unselect" and rewinds to 0 — no stored position outside the timeline.
  const togglePlay = useCallback(
    (id: string, keepPosition = false) => {
      const sound = sounds.find((s) => s.id === id);
      if (!sound) return;
      if (activeId === id && sound.source) {
        player.toggle();
        if (!player.isPlaying && !keepPosition) player.seek(0);
        if (!player.isPlaying) syncPosition(player.currentTime);
        const nowPlaying = player.isPlaying;
        setIsPlaying(nowPlaying);
        if (nowPlaying) startTicker();
        else stopTicker();
        return;
      }
      if (sound.source) {
        playLoaded(id, sound.source);
        return;
      }
      // Cloud row, first play on this device: download → decode → play.
      if (!sound.filePath || sound.sync === "downloading") return;
      patchSound(id, { sync: "downloading" });
      cloud
        .downloadSound(sound.filePath, sound.mime ?? null)
        .then((blob) => sourceFromBlob(blob, sound.mime ?? null, sound.duration))
        .then(({ source, duration, peaks }) => {
          patchSound(id, {
            source,
            sync: "synced",
            duration: duration > 0 ? duration : sound.duration,
            // PCM decode yields REAL peaks — upgrade the stored sparkline
            ...(peaks ? { peaks } : null),
          });
          playLoaded(id, source);
        })
        .catch((err) => {
          console.error("[studio] download failed", err);
          patchSound(id, { sync: "synced" }); // row stays usable; tap to retry
        });
    },
    [sounds, activeId, startTicker, stopTicker, syncPosition, patchSound, playLoaded],
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
        if (snd?.source?.kind === "element") URL.revokeObjectURL(snd.source.url);
        if (snd?.cloudId && snd.filePath) {
          cloud.deleteSound(snd.cloudId, snd.filePath).catch((err) =>
            console.error("[studio] cloud delete failed", err),
          );
        }
        return prev.filter((s) => s.id !== id);
      });
      setTimelineId((t) => (t === id ? null : t));
      if (activeIdRef.current === id) {
        resetPlayback();
      }
    },
    [resetPlayback],
  );

  const toggleFavorite = useCallback((id: string) => {
    setSounds((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const favorite = !s.favorite;
        if (s.cloudId) {
          cloud.setFavorite(s.cloudId, favorite).catch((err) =>
            console.error("[studio] favorite sync failed", err),
          );
        }
        return { ...s, favorite };
      }),
    );
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
      cloudLoading,
      timelineSound,
      activeSound,
      extract,
      togglePlay,
      addToTimeline,
      removeSound,
      toggleFavorite,
      retryUpload,
      seek,
      setSpeed,
    }),
    [
      sounds, activeId, timelineId, isPlaying, position, positionSV, speed,
      cloudLoading, timelineSound, activeSound, extract, togglePlay,
      addToTimeline, removeSound, toggleFavorite, retryUpload, seek, setSpeed,
    ],
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio(): StudioState {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error("useStudio must be used inside <StudioProvider>");
  return ctx;
}

/** m:ss formatter (timeline tick labels). */
export function fmtTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** mm:ss formatter (elapsed / total readout, per the new studio design). */
export function fmtTimePad(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// Keep the Platform import meaningful for native (no-op extract path above).
export const STUDIO_NATIVE = Platform.OS !== "web";
