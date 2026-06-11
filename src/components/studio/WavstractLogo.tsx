// The WAVstract wordmark (Figma 236:350) rebuilt from its source vectors —
// 14 rounded bars forming the double-W, crisp at any scale (WAV-29; the old
// screenshot PNG was pixelated).
import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

// [left, bboxW, bboxH, barW, barH, rotateDeg, scaleY, centerYOffset]
// verbatim from the Figma node (container-relative, design size 107×46).
const BARS: [number, number, number, number, number, number, number, number][] = [
  [20.04, 9.339, 30.513, 6.235, 30.026, -6, 1, -0.09],
  [26.87, 12.522, 38.628, 7.307, 37.98, -8, 1, 1.33],
  [12.75, 8.678, 38.277, 6.046, 37.948, -4, 1, -0.25],
  [6.83, 6.18, 19.74, 5.501, 19.559, -2, 1, -0.27],
  [0, 6.112, 12.225, 6.112, 12.225, 0, 1, -0.27],
  [34.37, 16.167, 45.272, 8.577, 44.458, -10, 1, -0.25],
  [40.09, 19.097, 27.909, 8.577, 26.794, -155, -1, 8.93],
  [77.63, 9.339, 30.513, 6.235, 30.026, -174, -1, -0.09],
  [67.61, 12.522, 38.628, 7.307, 37.98, -172, -1, 1.33],
  [85.57, 8.678, 38.277, 6.046, 37.948, -176, -1, -0.25],
  [93.99, 6.18, 19.74, 5.501, 19.559, -178, -1, -0.27],
  [100.89, 6.112, 12.225, 6.112, 12.225, 180, -1, -0.27],
  [56.46, 16.167, 45.272, 8.577, 44.458, -170, -1, -0.25],
  [47.81, 19.097, 27.909, 8.577, 26.794, -25, 1, 8.93],
];

const W = 107;
const H = 46;
const CY = 23;

export function WavstractLogo({
  width = 107,
  color = "#FFFFFF",
  style,
}: {
  width?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const s = width / W;
  return (
    <View style={[{ width, height: H * s }, style]}>
      {BARS.map(([left, bw, bh, barW, barH, rot, sy, cyOff], i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: left * s,
            top: (CY + cyOff - bh / 2) * s,
            width: bw * s,
            height: bh * s,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: barW * s,
              height: barH * s,
              borderRadius: 12 * s,
              backgroundColor: color,
              transform: [{ rotate: `${rot}deg` }, { scaleY: sy }],
            }}
          />
        </View>
      ))}
    </View>
  );
}
