// Icons exported verbatim from the Figma SVG paths. Each one has the same
// viewBox / size the design specifies so swapping in a different icon set
// later won't shift layout.
import React from "react";
import Svg, { Path, G } from "react-native-svg";
import svgPaths from "./svgPaths";
import { COLORS } from "./theme";

type IconProps = { size?: number; color?: string };

export function PlayTriangle({ size = 24, color = COLORS.white }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={svgPaths.p311c1d00 as string} fill={color} fillRule="evenodd" clipRule="evenodd" />
    </Svg>
  );
}

export function DownloadIcon({ size = 20, color = COLORS.white }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d={svgPaths.p23ff7580 as string} fill={color} fillRule="evenodd" clipRule="evenodd" />
    </Svg>
  );
}

export function UploadIcon({ size = 20, color = COLORS.white }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d={svgPaths.pf478b00 as string} fill={color} fillRule="evenodd" clipRule="evenodd" />
    </Svg>
  );
}

export function HeartIcon({ size = 20, color = COLORS.danger }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d={svgPaths.pa2a1700 as string} fill={color} />
    </Svg>
  );
}

export function FilterIcon({ size = 20, color = COLORS.white }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d={svgPaths.p33057a80 as string} fill={color} fillRule="evenodd" clipRule="evenodd" />
    </Svg>
  );
}

export function ChevronDownIcon({ size = 20, color = COLORS.white }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d={svgPaths.p1ac285c0 as string} fill={color} fillRule="evenodd" clipRule="evenodd" />
    </Svg>
  );
}

export function TrashIcon({ size = 24, color = COLORS.white }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={svgPaths.p30b66a00 as string} fill={color} fillRule="evenodd" clipRule="evenodd" />
    </Svg>
  );
}

export function StudioIcon({ size = 20, color = COLORS.white }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d={svgPaths.p4ac8280 as string} fill={color} fillRule="evenodd" clipRule="evenodd" />
    </Svg>
  );
}

export function SettingsIcon({ size = 20, color = COLORS.white }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d={svgPaths.p174f5800 as string} fill={color} fillRule="evenodd" clipRule="evenodd" />
    </Svg>
  );
}

// Small white plus inside a circle (list row "add" button)
export function PlusIcon({ size = 20, color = COLORS.white }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d="M4.16667 10H15.8333" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
      <Path d="M10 4.16667V15.8333" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
    </Svg>
  );
}

// 6-bar audio-visualizer icon used inside list rows
export function AudioBarsIcon({ size = 20, color = COLORS.white }: IconProps) {
  const stroke = { stroke: color, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, strokeOpacity: 0.8, strokeWidth: 1.5 };
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d="M1.66667 8.33333V10.8333" {...stroke} />
      <Path d="M5 5V14.1667" {...stroke} />
      <Path d="M8.33333 2.5V17.5" {...stroke} />
      <Path d="M11.6667 6.66667V12.5" {...stroke} />
      <Path d="M15 4.16667V15" {...stroke} />
      <Path d="M18.3333 8.33333V10.8333" {...stroke} />
    </Svg>
  );
}
