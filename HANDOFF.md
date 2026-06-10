# WAVstract Studio — Handoff

This file lets work continue if the primary agent (Claude Code desktop) is rate-limited.
Hand this whole repo + this file to a fallback agent. When it's done, it fills in
**§6 Handoff-back** and you give the repo back to Claude Code to resume.

---

## 1. What this project is
Pixel-perfect Expo / React Native (**web-first**) port of a Figma design. Audio tool:
extract a local file → play it → send to a timeline → a speed/pitch slider does
slowed/nightcore via `playbackRate` (no pitch correction).

Source of truth for tasks = **Linear team "WAVstract"** (Claude Code reads it via MCP;
fallback agents can't — see the issue snapshot in §4).

## 2. Build & verify (Windows / PowerShell)
```
npm install
npx expo start --web        # serves on http://localhost:8082
npx tsc --noEmit            # MUST stay clean — run before handing back
```
Verification is by `tsc` + the running web app. **Interaction feel (drag, press,
audio playback) must be eyeballed by the user** — automation can't drive gestures/audio.

## 3. Architecture (1-minute version)
- `src/lib/audio-engine.ts` — single shared `Player` (one `AudioBufferSourceNode` →
  `gain` → `analyser` → destination). `setRate` = speed+pitch. Web-only; native is a stub.
- `src/lib/use-studio.tsx` — `StudioProvider` / `useStudio` context (sounds, activeId,
  timelineId, isPlaying, position, speed). One Player ⇒ list preview & timeline are two
  views of it (so "+ to timeline" never cuts audio).
- `src/components/studio/*` — Timeline, SpeedSlider, AudioList, TabBar, DevTools,
  Glass/GlassEdge (liquid-glass overlay), PressableScale/PopText/MorphPlayPause (animation
  primitives, Reanimated). Barrel: `index.ts`.
- Conventions: glass = `<GlassEdge>` overlay; **never** put `fontWeight` on Geist text
  (faux-bold on web); slider is linear 0.5–1.5 (1.0 centered), 0.1 ticks.

## 4. Linear issue snapshot (update when handing back)
- **WAV-16** (In Progress) — audio engine. Done: local-file extract → decode → playback →
  slider → gain → analyser + iOS unlock. Deferred: yt-dlp link path, native.
- **WAV-17** (In Progress) — table: idle visualizer 65% opacity, live waves when playing. ✅
- **WAV-15** (In Progress) — animation/UX. Done: PressableScale, PopText, MorphPlayPause,
  row "card resize" reveal, tooltip reveal. **Next: row state machine (hover→selected,
  swipe-left → favorite/delete), All/Favorites filter, link-paste card.**
- WAV-18/20/21/14/13/12/11/10 = Done.

## 5. Current task for the fallback agent
> (Fill this in before handing off — be specific. Default if blank: continue WAV-15 row
> state machine: on web hover a row → animate to the "selected" glass state; on swipe-left
> reveal a favorite heart + red delete, Apple/transitions.dev spring feel, using the
> existing `ListRow` in `src/components/studio/AudioList.tsx`.)

## 5b. Session log — 2026-06-10 (Opus 4.8, account 2)
Done this session:
- **Apple motion system**: new `src/components/studio/motion.ts` (SwiftUI spring presets
  `.smooth/.snappy/.bouncy/.press`). `PopText` rewritten to iOS `.numericText()` directional
  roll. Retuned MorphPlayPause / PressableScale / SpeedSlider tooltip / row entrance / filter
  group. (WAV-15)
- **Video support** (WAV-16): `extractAudio` two-tier — PCM decode, else media-element fallback
  (`preservesPitch=false`). `Player` got an `element` mode. Fixed iOS upload hang (DOM-attached
  `<video>` + `playsInline` + 4s timeouts; row inserts before cover resolves).
- **Deployment**: verified `expo export --platform web` (clean), added `vercel.json`, pushing
  to GitHub `wavstract-studio` → Vercel.

OPEN BUGS — phone, ELEMENT/VIDEO mode only (buffer/audio mode fine). User filing in Linear:
1. Flaky iOS playback (laggy/cuts/silent) — likely `createMediaElementSource` unreliable on iOS
   + rAF-per-frame setState flood. Fix: play element directly + stop per-frame setState.
2. Slider↔timeline desync on rate change (~2s cut). Tied to #1.
3. Audio ends before playhead — duration desync (Timeline uses stale `sound.duration` vs live
   `el.currentTime`). Fix: authoritative `el.duration`.

## 6. Handoff-back (FALLBACK AGENT FILLS THIS IN)
Before returning the repo, do ALL of:
1. Make sure `npx tsc --noEmit` is clean.
2. Commit your work on a branch: `git checkout -b handoff/<short-name> && git add -A && git commit`.
3. Fill in below so Claude Code can resume from a `git diff` + this summary:

```
### Changed
- <file>: <what & why>

### How I verified
- <tsc result, what you saw in the web app>

### Unresolved / needs Claude Code
- <anything you couldn't do — especially Figma/Linear updates, which need MCP>

### Questions for the user
- <if any>
```
