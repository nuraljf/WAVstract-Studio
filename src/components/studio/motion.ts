// One shared motion language for the whole studio (WAV-15).
//
// These mirror Apple's SwiftUI spring presets, which are defined as
// `spring(duration:bounce:)`. Reanimated exposes the same physics through a
// `{ duration, dampingRatio }` config, and Apple's `bounce` maps to it directly:
//
//     dampingRatio = 1 - bounce        (for bounce >= 0)
//
// so .smooth (bounce 0) -> dampingRatio 1, .snappy (bounce .15) -> .85,
// .bouncy (bounce .3) -> .7. Durations are in ms (SwiftUI's 0.5s = 500ms).
//
// Use these everywhere instead of hand-tuned damping/stiffness so every
// transition in the app shares one feel.

export const SPRING = {
  // .smooth — no overshoot, fully damped. Best for content & text changes.
  smooth: { duration: 500, dampingRatio: 1 },
  // .snappy — a hair of bounce. Default for controls, toggles, tooltips.
  snappy: { duration: 380, dampingRatio: 0.86 },
  // .bouncy — playful overshoot. For entrances / reveals.
  bouncy: { duration: 520, dampingRatio: 0.72 },
  // Fast, crisp press feedback — quicker than .snappy, no bounce.
  press: { duration: 220, dampingRatio: 0.92 },
} as const;

// How long a press dip is held before springing back, so a quick tap is still
// visibly registered (the dip would otherwise reverse before the eye sees it).
export const PRESS_HOLD_MS = 90;
