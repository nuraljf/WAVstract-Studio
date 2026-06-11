// WAVstract audio engine (WAV-16) — web-first.
//
// The whole chain lives here: a decoded PCM buffer is played through a single
// `AudioBufferSourceNode`, and the speed/pitch slider maps DIRECTLY onto that
// node's `playbackRate`. Because the buffer source does NO pitch correction,
// changing the rate moves speed and pitch together — the slowed+reverb /
// nightcore behaviour the design calls for.
//
// One global Player is shared by the list preview AND the timeline, so
// "add to timeline" never restarts playback (no audio cut, WAV-9 / WAV-15).
//
// Native (iOS/Android) is a no-op stub for now — Phase 1 is web-first. A native
// build would swap this for expo-audio with `shouldCorrectPitch: false`.

import { Platform } from "react-native";

export const isAudioSupported =
  Platform.OS === "web" &&
  typeof window !== "undefined" &&
  typeof (window.AudioContext ?? (window as any).webkitAudioContext) !== "undefined";

// ---- AudioContext singleton -------------------------------------------------

let _ctx: AudioContext | null = null;

export function getCtx(): AudioContext {
  if (!_ctx) {
    const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
    _ctx = new Ctor();
  }
  return _ctx;
}

// ---- iOS silent-switch unlock ----------------------------------------------
// A silent looping <audio> element elevates iOS's audio session from "ambient"
// (muted by the ringer switch) to "playback" (ignores it). Must run inside a
// user gesture, so we call it from the first play().
const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
let _silent: HTMLAudioElement | null = null;
let _unlocked = false;

function unlockIOS() {
  if (_unlocked || typeof Audio === "undefined") return;
  _unlocked = true;
  try {
    _silent = new Audio(SILENT_WAV);
    _silent.loop = true;
    void _silent.play().catch(() => {});
  } catch {
    /* non-fatal */
  }
}

// ---- Decode + peaks ---------------------------------------------------------

// What the Player can play back. A "buffer" source is fully decoded PCM (best:
// real waveform + analyser). An "element" source is the original file played
// through an <audio>/<video> tag — the only way to handle formats Web Audio's
// decodeAudioData can't demux (notably video containers: .mp4 / .mov).
export type PlayableSource =
  | { kind: "buffer"; buffer: AudioBuffer }
  | { kind: "element"; url: string; duration: number };

export type Extracted = {
  source: PlayableSource;
  duration: number;
  peaks: number[];
  hasRealWaveform: boolean; // false → peaks are a placeholder (couldn't read PCM)
};

// decodeAudioData has both a modern promise form and an old callback form;
// older iOS Safari only has the callback form. Support both.
function decodeAudioData(ctx: AudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    const maybe = ctx.decodeAudioData(data, resolve, reject) as unknown as Promise<AudioBuffer> | undefined;
    if (maybe && typeof maybe.then === "function") maybe.then(resolve, reject);
  });
}

// A video container by MIME type, or by extension when iOS gives no type.
function isVideoFile(file: File): boolean {
  if (file.type) return file.type.startsWith("video");
  return /\.(mp4|mov|m4v|webm|avi|mkv|3gp)$/i.test(file.name);
}

// Duration of a media file via a throwaway element (metadata only). On iOS a
// detached/headless <video> often never fires its events, so we attach it
// hidden, set playsInline, and time out rather than hang forever.
function mediaDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") return resolve(0);
    const el = document.createElement("video");
    el.preload = "metadata";
    el.muted = true;
    (el as any).playsInline = true;
    el.style.display = "none";
    let done = false;
    const finish = (d: number) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      el.remove();
      resolve(Number.isFinite(d) && d > 0 ? d : 0);
    };
    el.onloadedmetadata = () => finish(el.duration);
    el.onerror = () => finish(0);
    const timer = setTimeout(() => finish(el.duration || 0), 4000);
    document.body.appendChild(el);
    el.src = url;
  });
}

/**
 * Turn a picked file into something playable. For audio, decodes to PCM (real
 * waveform + analyser). For video (.mp4/.mov) — which Web Audio can't demux and
 * which iOS rejects — it skips the decode entirely (no point reading a whole
 * video into memory just to fail) and plays through a media element. Web only.
 */
export async function extractAudio(file: File): Promise<Extracted> {
  if (!isVideoFile(file)) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = await decodeAudioData(getCtx(), arrayBuffer);
      return {
        source: { kind: "buffer", buffer },
        duration: buffer.duration,
        peaks: computePeaks(buffer, 90),
        hasRealWaveform: true,
      };
    } catch {
      // Audio file Web Audio couldn't decode — fall through to the element path.
    }
  }
  const url = URL.createObjectURL(file);
  const duration = await mediaDuration(url);
  return {
    source: { kind: "element", url, duration },
    duration,
    peaks: syntheticPeaks(90),
    hasRealWaveform: false,
  };
}

/**
 * Turn downloaded cloud bytes into something playable (WAV-27). Mirrors
 * extractAudio but starts from a Blob + known MIME/duration from the library
 * row. Returns real peaks when PCM decode succeeds (upgrades synthetic ones).
 */
export async function sourceFromBlob(
  blob: Blob,
  mime: string | null,
  knownDuration: number,
): Promise<{ source: PlayableSource; duration: number; peaks: number[] | null }> {
  const isVideo = (mime ?? blob.type ?? "").startsWith("video");
  if (!isVideo) {
    try {
      const buffer = await decodeAudioData(getCtx(), await blob.arrayBuffer());
      return {
        source: { kind: "buffer", buffer },
        duration: buffer.duration,
        peaks: computePeaks(buffer, 90),
      };
    } catch {
      // fall through to the element path
    }
  }
  const url = URL.createObjectURL(blob);
  const duration = knownDuration > 0 ? knownDuration : await mediaDuration(url);
  return { source: { kind: "element", url, duration }, duration, peaks: null };
}

// Placeholder waveform for element sources (no PCM to measure). A calm, fading
// shape so the Timeline still renders a scrubbable track instead of a flat line;
// live movement still comes from the analyser while it plays (WAV-17).
function syntheticPeaks(count: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = count > 1 ? i / (count - 1) : 0;
    const envelope = Math.sin(t * Math.PI); // fade in + out
    const ripple = 0.55 + 0.45 * Math.sin(t * Math.PI * 13);
    out.push(0.22 + 0.6 * envelope * ripple);
  }
  return out;
}

function setPreservesPitch(el: HTMLMediaElement, v: boolean) {
  const a = el as any;
  a.preservesPitch = v;
  a.mozPreservesPitch = v;
  a.webkitPreservesPitch = v;
}

/** Downsample a buffer to `count` normalized loudness peaks (0..1). */
export function computePeaks(buffer: AudioBuffer, count = 90): number[] {
  const channel = buffer.getChannelData(0);
  const block = Math.max(1, Math.floor(channel.length / count));
  const peaks: number[] = [];
  let max = 0;
  for (let i = 0; i < count; i++) {
    const start = i * block;
    let peak = 0;
    for (let j = 0; j < block && start + j < channel.length; j++) {
      const v = Math.abs(channel[start + j]);
      if (v > peak) peak = v;
    }
    peaks.push(peak);
    if (peak > max) max = peak;
  }
  // Normalize so the loudest bar is 1.0 (keeps quiet tracks visible).
  return max > 0 ? peaks.map((p) => p / max) : peaks;
}

/**
 * Cover art: first frame of a video file, else null (caller shows the music
 * glyph). Returns a data URL. Web only.
 */
export async function extractCover(file: File): Promise<string | null> {
  if (!isVideoFile(file) || typeof document === "undefined") return null;
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    (video as any).playsInline = true; // iOS won't decode frames otherwise
    video.crossOrigin = "anonymous";
    video.preload = "metadata";
    video.style.display = "none";
    let done = false;
    const finish = (r: string | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      video.remove();
      resolve(r);
    };
    const grab = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 80;
        canvas.height = video.videoHeight || 80;
        const g = canvas.getContext("2d");
        if (!g) return finish(null);
        g.drawImage(video, 0, 0, canvas.width, canvas.height);
        finish(canvas.toDataURL("image/png"));
      } catch {
        finish(null);
      }
    };
    video.onloadeddata = () => {
      // seek a hair past 0 so we don't grab a black pre-roll frame
      try {
        video.currentTime = Math.min(0.1, (video.duration || 1) / 2);
      } catch {
        grab();
      }
    };
    video.onseeked = grab;
    video.onerror = () => finish(null);
    // iOS can silently never fire any of the above — never hang the upload.
    const timer = setTimeout(() => finish(null), 4000);
    document.body.appendChild(video);
    video.src = url;
  });
}

// ---- Player -----------------------------------------------------------------

type EndedCb = () => void;
type TickCb = (position: number) => void;
type DurationCb = (duration: number) => void;

class Player {
  private mode: "buffer" | "element" = "buffer";

  private buffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;

  // element-mode backing. The element plays DIRECTLY (never through
  // createMediaElementSource): on iOS Safari that node fails to capture the
  // element's own output, so the song played twice slightly offset (the
  // "doubled / echo" bug, WAV-22) and rate changes stalled the pipeline.
  // Cost: no live analyser bars for element sources — reliability wins.
  private el: HTMLMediaElement | null = null;
  private elDuration = 0;

  private gain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private freq: Uint8Array<ArrayBuffer> | null = null;

  private rate = 1;
  private volume = 1;

  private startCtxTime = 0; // ctx.currentTime when the current source started
  private startOffset = 0; // buffer position (s) at that moment / paused position
  private playing = false;
  private stoppingManually = false;

  onEnded: EndedCb | null = null;
  onTick: TickCb | null = null;
  // Fired when an element source learns its REAL duration from the media
  // pipeline (loadedmetadata/durationchange). The upfront metadata probe can be
  // wrong/zero on iOS, which made the timeline outlive the audio (WAV-22).
  onDuration: DurationCb | null = null;

  get duration(): number {
    return this.mode === "element" ? this.elDuration : (this.buffer?.duration ?? 0);
  }
  get isPlaying(): boolean {
    return this.playing;
  }
  get speed(): number {
    return this.rate;
  }

  /** Current playback position in seconds (rate-aware). */
  get currentTime(): number {
    if (this.mode === "element") {
      return this.el ? clamp(this.el.currentTime, 0, this.duration) : 0;
    }
    if (!this.buffer) return 0;
    if (!this.playing) return clamp(this.startOffset, 0, this.duration);
    const elapsed = (getCtx().currentTime - this.startCtxTime) * this.rate;
    return clamp(this.startOffset + elapsed, 0, this.duration);
  }

  private ensureGain(): GainNode {
    if (!this.gain) {
      const ctx = getCtx();
      this.gain = ctx.createGain();
      this.gain.gain.value = this.volume;
      // gain → analyser → destination, so the playing row can visualize live audio.
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 64; // 32 frequency bins — plenty for a tiny row meter
      this.freq = new Uint8Array(this.analyser.frequencyBinCount);
      this.gain.connect(this.analyser);
      this.analyser.connect(ctx.destination);
    }
    return this.gain;
  }

  /** Whether levels() can produce live data (buffer mode only — element
   *  sources play outside the Web Audio graph, see the class comment). */
  get hasLiveLevels(): boolean {
    return this.mode === "buffer";
  }

  /** Live frequency magnitudes (0..1), downsampled to `n` bars. Empty when idle. */
  levels(n = 9): number[] {
    if (this.mode === "element") return [];
    if (!this.analyser || !this.freq || !this.playing) return [];
    this.analyser.getByteFrequencyData(this.freq);
    const bins = this.freq.length;
    const step = Math.max(1, Math.floor(bins / n));
    const out: number[] = [];
    for (let i = 0; i < n; i++) {
      let m = 0;
      for (let j = 0; j < step; j++) {
        const v = this.freq[i * step + j] ?? 0;
        if (v > m) m = v;
      }
      out.push(m / 255);
    }
    return out;
  }

  /** Load a new source (resets position to 0, stops any current playback). */
  load(source: PlayableSource) {
    this.stopSource();
    this.teardownElement();
    this.startOffset = 0;
    this.playing = false;

    if (source.kind === "buffer") {
      this.mode = "buffer";
      this.buffer = source.buffer;
      this.elDuration = 0;
      return;
    }

    // element mode: play the original file straight through a media element.
    this.mode = "element";
    this.buffer = null;
    this.elDuration = source.duration;

    const el = document.createElement("video");
    el.preload = "auto";
    (el as any).playsInline = true; // iOS: don't hijack into fullscreen
    el.style.display = "none";
    setPreservesPitch(el, false); // rate changes pitch too (slowed / nightcore)
    el.playbackRate = this.rate;
    el.volume = this.volume;
    el.onended = () => {
      this.playing = false;
      this.onTick?.(this.duration);
      this.onEnded?.();
    };
    // The media pipeline is the only honest source of duration for element
    // files — adopt it as soon as (and whenever) it's known.
    const adoptDuration = () => {
      const d = el.duration;
      if (Number.isFinite(d) && d > 0 && Math.abs(d - this.elDuration) > 0.05) {
        this.elDuration = d;
        this.onDuration?.(d);
      }
    };
    el.onloadedmetadata = adoptDuration;
    el.ondurationchange = adoptDuration;
    if (typeof document !== "undefined") document.body.appendChild(el);
    el.src = source.url;
    this.el = el;
  }

  play(offset?: number) {
    unlockIOS();
    const ctx = getCtx();
    void ctx.resume();

    if (this.mode === "element") {
      if (!this.el) return;
      let off = offset ?? this.el.currentTime;
      if (!Number.isFinite(off)) off = 0;
      if (off >= this.duration - 0.01) off = 0;
      try { this.el.currentTime = off; } catch { /* not seekable yet */ }
      // iOS resets preservesPitch behind our back on some pipeline restarts —
      // re-assert it with the rate every time we start.
      setPreservesPitch(this.el, false);
      this.el.playbackRate = this.rate;
      void this.el.play().catch(() => {});
      this.playing = true;
      return;
    }

    if (!this.buffer) return;
    this.stopSource();

    const source = ctx.createBufferSource();
    source.buffer = this.buffer;
    source.playbackRate.value = this.rate;
    source.connect(this.ensureGain());
    source.onended = () => {
      if (this.stoppingManually) {
        this.stoppingManually = false;
        return;
      }
      // natural end
      this.playing = false;
      this.startOffset = this.duration;
      this.onTick?.(this.duration);
      this.onEnded?.();
    };

    let off = offset ?? this.currentTime;
    if (!Number.isFinite(off)) off = 0; // guards a NaN seek (e.g. web locationX)
    this.startOffset = clamp(off, 0, this.duration);
    // if we're at the very end, restart from 0
    if (this.startOffset >= this.duration - 0.01) this.startOffset = 0;
    this.startCtxTime = ctx.currentTime;
    source.start(0, this.startOffset);
    this.source = source;
    this.playing = true;
  }

  pause() {
    if (!this.playing) return;
    if (this.mode === "element") {
      this.el?.pause();
      this.playing = false;
      return;
    }
    this.startOffset = this.currentTime;
    this.stopSource();
    this.playing = false;
  }

  toggle() {
    this.playing ? this.pause() : this.play();
  }

  seek(t: number) {
    if (!Number.isFinite(t)) return; // ignore a bad seek instead of crashing
    const pos = clamp(t, 0, this.duration);
    if (this.mode === "element") {
      if (this.el) {
        try { this.el.currentTime = pos; } catch { /* not seekable yet */ }
      }
      this.onTick?.(pos);
      return;
    }
    if (this.playing) {
      this.play(pos);
    } else {
      this.startOffset = pos;
      this.onTick?.(pos);
    }
  }

  /**
   * Change speed+pitch WITHOUT a restart — keeps the audio continuous. We
   * re-anchor the position math so currentTime stays correct across the change.
   */
  setRate(rate: number) {
    if (this.mode === "element") {
      if (this.el) {
        setPreservesPitch(this.el, false); // iOS: must hold across rate changes
        this.el.playbackRate = rate; // element tracks its own clock
      }
      this.rate = rate;
      return;
    }
    if (this.playing) {
      const pos = this.currentTime; // measured with the OLD rate
      this.startOffset = pos;
      this.startCtxTime = getCtx().currentTime;
      if (this.source) this.source.playbackRate.value = rate;
    }
    this.rate = rate;
  }

  setVolume(v: number) {
    this.volume = clamp(v, 0, 1);
    if (this.gain) this.gain.gain.value = this.volume;
    if (this.el) this.el.volume = this.volume;
  }

  /** Fully drop the loaded sound (used when its row is deleted, WAV-24). */
  unload() {
    this.stopSource();
    this.teardownElement();
    this.buffer = null;
    this.elDuration = 0;
    this.startOffset = 0;
    this.playing = false;
  }

  private stopSource() {
    if (this.source) {
      this.stoppingManually = true;
      try {
        this.source.onended = null;
        this.source.stop();
      } catch {
        /* already stopped */
      }
      this.source.disconnect();
      this.source = null;
      this.stoppingManually = false;
    }
  }

  private teardownElement() {
    if (!this.el) return;
    try {
      this.el.pause();
      this.el.onended = null;
      this.el.onloadedmetadata = null;
      this.el.ondurationchange = null;
    } catch {
      /* ignore */
    }
    // iOS keeps a hard cap on simultaneously-open media pipelines; detach the
    // src and force a load so the decoder slot is actually released (a leaked
    // slot is one way "add a sound" silently stops working, WAV-22).
    try {
      this.el.removeAttribute("src");
      this.el.load();
    } catch {
      /* ignore */
    }
    this.el.remove();
    // Note: the source's object URL is intentionally NOT revoked — the same
    // Sound may be selected again later and reloaded from it.
    this.el = null;
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

// Single shared instance — list preview and timeline are two views of it.
export const player = new Player();
