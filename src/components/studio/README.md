# Studio screen — Expo handoff (visuals only, 1:1 with Figma)

Drop the entire `studio/` folder into your Expo project (e.g. `app/components/studio/`)
and render `<StudioScreen />`. No logic — only design. All `onPress` props
are stubs to wire up in your desktop Claude Code session.

## Install

```sh
npx expo install expo-blur react-native-svg expo-font
npx expo install @expo-google-fonts/geist
```

## Font loading (Geist + SF Pro)

In your root layout / `App.tsx`:

```tsx
import {
  useFonts,
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
} from "@expo-google-fonts/geist";

export default function App() {
  const [loaded] = useFonts({ Geist_400Regular, Geist_500Medium, Geist_600SemiBold });
  if (!loaded) return null;
  return <StudioScreen />;
}
```

SF Pro is the iOS system font on iOS (used automatically for "Save WAV",
"Extract audio", tab labels). On Android it falls back to `sans-serif` /
`sans-serif-medium`. To force real SF Pro on Android, drop
`SF-Pro-Text-Regular.otf` / `-Medium.otf` / `-Semibold.otf` into
`assets/fonts/`, register them in `useFonts`, then change `FONT.sfRegular`
/ `sfMedium` / `sfSemibold` in `theme.ts` to those names.

## Files

| file              | what it does |
|-------------------|--------------|
| `StudioScreen.tsx`| Full page (Timeline + SpeedSlider + Extract + List + TabBar) |
| `Timeline.tsx`    | Waveform card with playhead, time strip, play button, Save WAV pill |
| `SpeedSlider.tsx` | "Playback speed & pitch" — three overlaid tick rows + tooltip |
| `AudioList.tsx`   | `FiltersRow`, `ListRowUnselected`, `ListRowPlaying`, `ListRowEditing` |
| `TabBar.tsx`      | Floating Studio / Library / Settings pill |
| `Glass.tsx`       | Reusable "liquid glass" surface (BlurView + tint + inset highlight) |
| `icons.tsx`       | All Figma icon paths (Play, Download, Upload, Heart, Filter, Chevron, Trash, Studio, Settings, Plus, AudioBars) |
| `theme.ts`        | COLORS, FONT, SHADOW tokens |
| `svgPaths.ts`     | Verbatim waveform + icon SVG path data from Figma |
| `assets/album-art.png` | Sample album art used by the list rows |

## Design tokens (from Figma)

- Background: `#050505`
- Accent: `#1A62FF`
- Danger / heart: `#FF4343`
- Panel: `rgba(0,0,0,0.65)` over a dark BlurView
- Inset white highlight (RN has no inset shadow): 1px `rgba(255,255,255,0.5)` border
- Card radius: 34
- Pill / chip radius: 16
- Card shadow: `0 2 8 rgba(0,0,0,0.1)`
- Gap between groups: 30; intra-group gap: 10

## What's still TODO (logic-side)

- Real waveform rendering bound to audio buffer (current waveform is the
  static Figma vector for layout fidelity).
- Playhead x-position from playback progress.
- `Timeline` `elapsed` / `total` strings.
- Time-strip tick labels (currently all `0:00`).
- Speed slider gesture: drag knob → update `activeWidth` + `knobOffset` +
  `tooltipOffset` + `speedLabel`.
- `Extract audio` flow.
- `FiltersRow` actions + filter menu.
- List row press, play/pause icon swap, add-to-project, favorite, delete.
- Tab routing (`onChange` already wired to local `useState` — replace with
  `expo-router`/`react-navigation`).
- Swap the placeholder `album-art.png` for the user's real cover art.
