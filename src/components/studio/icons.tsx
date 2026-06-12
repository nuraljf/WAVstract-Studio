// Icons exported verbatim from the Figma SVG paths. Each one has the same
// viewBox / size the design specifies so swapping in a different icon set
// later won't shift layout.
import React from "react";
import Svg, { Path, G, Defs, Mask, Rect, Circle } from "react-native-svg";
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

// ---- WAV-27 accounts + settings icons (Figma SVG paths, verbatim) ----

export function AppleIcon({ size = 24, color = COLORS.white }: IconProps) {
  // natural viewBox 15.17×18 — drawn inside a 24 box, centered like the design
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G transform="translate(4.4 3)">
        <Path d="M12.6371 17.28C11.6571 18.23 10.5871 18.08 9.55708 17.63C8.46708 17.17 7.46708 17.15 6.31708 17.63C4.87708 18.25 4.11708 18.07 3.25708 17.28C-1.62292 12.25 -0.902922 4.59 4.63708 4.31C5.98708 4.38 6.92708 5.05 7.71708 5.11C8.89708 4.87 10.0271 4.18 11.2871 4.27C12.7971 4.39 13.9371 4.99 14.6871 6.07C11.5671 7.94 12.3071 12.05 15.1671 13.2C14.5971 14.7 13.8571 16.19 12.6271 17.29L12.6371 17.28ZM7.61708 4.25C7.46708 2.02 9.27708 0.18 11.3571 0C11.6471 2.58 9.01708 4.5 7.61708 4.25Z" fill={color} />
      </G>
    </Svg>
  );
}

// Google "G" in brand colors (standard mark).
export function GoogleIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Path d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" fill="#EA4335" />
      <Path d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" fill="#4285F4" />
      <Path d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" fill="#FBBC05" />
      <Path d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" fill="#34A853" />
    </Svg>
  );
}

export function ChevronRightIcon({ size = 24, color = COLORS.white }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path fillRule="evenodd" clipRule="evenodd" d="M16.28 11.47C16.4205 11.6106 16.4993 11.8012 16.4993 12C16.4993 12.1988 16.4205 12.3894 16.28 12.53L8.78 20.03C8.63782 20.1625 8.44978 20.2346 8.25548 20.2312C8.06118 20.2277 7.87579 20.149 7.73838 20.0116C7.60097 19.8742 7.52225 19.6888 7.51883 19.4945C7.5154 19.3002 7.58752 19.1122 7.72 18.97L14.69 12L7.72 5.03C7.58752 4.88783 7.5154 4.69978 7.51883 4.50548C7.52225 4.31118 7.60097 4.12579 7.73838 3.98838C7.87579 3.85097 8.06118 3.77225 8.25548 3.76883C8.44978 3.7654 8.63782 3.83752 8.78 3.97L16.28 11.47Z" fill={color} />
    </Svg>
  );
}

export function UserGlyphIcon({ size = 30, color = "#000000" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 30 30" fill="none">
      <Path fillRule="evenodd" clipRule="evenodd" d="M9.375 7.5C9.375 6.00816 9.96763 4.57742 11.0225 3.52252C12.0774 2.46763 13.5082 1.875 15 1.875C16.4918 1.875 17.9226 2.46763 18.9775 3.52252C20.0324 4.57742 20.625 6.00816 20.625 7.5C20.625 8.99184 20.0324 10.4226 18.9775 11.4775C17.9226 12.5324 16.4918 13.125 15 13.125C13.5082 13.125 12.0774 12.5324 11.0225 11.4775C9.96763 10.4226 9.375 8.99184 9.375 7.5ZM4.68875 25.1312C4.7309 22.4243 5.8358 19.8426 7.76495 17.9432C9.6941 16.0439 12.2928 14.9793 15 14.9793C17.7072 14.9793 20.3059 16.0439 22.2351 17.9432C24.1642 19.8426 25.2691 22.4243 25.3112 25.1312C25.3145 25.3135 25.2646 25.4927 25.1675 25.647C25.0705 25.8013 24.9306 25.924 24.765 26C21.7015 27.4046 18.3702 28.1296 15 28.125C11.5175 28.125 8.20875 27.365 5.235 26C5.06936 25.924 4.92947 25.8013 4.83245 25.647C4.73544 25.4927 4.6855 25.3135 4.68875 25.1312Z" fill={color} />
    </Svg>
  );
}

export function DisplayNameIcon({ size = 24, color = COLORS.white }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21.731 2.269C21.2387 1.77681 20.5711 1.50031 19.875 1.50031C19.1789 1.50031 18.5113 1.77681 18.019 2.269L16.862 3.426L20.574 7.138L21.731 5.981C22.2232 5.48873 22.4997 4.82112 22.4997 4.125C22.4997 3.42888 22.2232 2.76127 21.731 2.269ZM19.513 8.199L15.801 4.487L7.401 12.887C6.78385 13.5038 6.33018 14.2648 6.081 15.101L5.281 17.786C5.24238 17.9156 5.2395 18.0532 5.27266 18.1842C5.30583 18.3153 5.37381 18.435 5.46941 18.5306C5.56502 18.6262 5.68469 18.6942 5.81576 18.7273C5.94683 18.7605 6.08443 18.7576 6.214 18.719L8.899 17.919C9.73523 17.6698 10.4962 17.2161 11.113 16.599L19.513 8.199Z" fill={color} />
      <Path d="M5.25 5.25C4.45435 5.25 3.69129 5.56607 3.12868 6.12868C2.56607 6.69129 2.25 7.45435 2.25 8.25V18.75C2.25 19.5456 2.56607 20.3087 3.12868 20.8713C3.69129 21.4339 4.45435 21.75 5.25 21.75H15.75C16.5456 21.75 17.3087 21.4339 17.8713 20.8713C18.4339 20.3087 18.75 19.5456 18.75 18.75V13.5C18.75 13.3011 18.671 13.1103 18.5303 12.9697C18.3897 12.829 18.1989 12.75 18 12.75C17.8011 12.75 17.6103 12.829 17.4697 12.9697C17.329 13.1103 17.25 13.3011 17.25 13.5V18.75C17.25 19.1478 17.092 19.5294 16.8107 19.8107C16.5294 20.092 16.1478 20.25 15.75 20.25H5.25C4.85218 20.25 4.47064 20.092 4.18934 19.8107C3.90804 19.5294 3.75 19.1478 3.75 18.75V8.25C3.75 7.85218 3.90804 7.47064 4.18934 7.18934C4.47064 6.90804 4.85218 6.75 5.25 6.75H10.5C10.6989 6.75 10.8897 6.67098 11.0303 6.53033C11.171 6.38968 11.25 6.19891 11.25 6C11.25 5.80109 11.171 5.61032 11.0303 5.46967C10.8897 5.32902 10.6989 5.25 10.5 5.25H5.25Z" fill={color} />
    </Svg>
  );
}

export function DownloadsCloudIcon({ size = 24, color = COLORS.white }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path fillRule="evenodd" clipRule="evenodd" d="M10.5 3.75C9.67022 3.74993 8.84945 3.92197 8.08954 4.25525C7.32963 4.58854 6.64712 5.07582 6.08512 5.68631C5.52313 6.2968 5.09387 7.01722 4.82448 7.80205C4.55508 8.58688 4.4514 9.41906 4.52 10.246C3.4385 10.7528 2.56211 11.6131 2.03548 12.6851C1.50885 13.757 1.36346 14.9765 1.62332 16.1422C1.88317 17.308 2.53273 18.3503 3.46478 19.0971C4.39683 19.8439 5.55566 20.2506 6.75 20.25H18C18.9952 20.2503 19.9624 19.9207 20.7504 19.3128C21.5383 18.7048 22.1025 17.8528 22.3546 16.8901C22.6068 15.9274 22.5326 14.9082 22.1439 13.9921C21.7551 13.076 21.0736 12.3146 20.206 11.827C20.2949 11.2564 20.2509 10.673 20.0773 10.1223C19.9037 9.57153 19.6053 9.06831 19.2053 8.65184C18.8053 8.23537 18.3145 7.91691 17.7712 7.72128C17.2278 7.52565 16.6467 7.45813 16.073 7.524C15.6278 6.40992 14.8588 5.45487 13.8654 4.78214C12.872 4.10941 11.6998 3.74989 10.5 3.75ZM12.75 9.75C12.75 9.55109 12.671 9.36032 12.5303 9.21967C12.3897 9.07902 12.1989 9 12 9C11.8011 9 11.6103 9.07902 11.4697 9.21967C11.329 9.36032 11.25 9.55109 11.25 9.75V14.69L9.53 12.97C9.38782 12.8375 9.19978 12.7654 9.00548 12.7688C8.81118 12.7723 8.62579 12.851 8.48838 12.9884C8.35097 13.1258 8.27225 13.3112 8.26882 13.5055C8.2654 13.6998 8.33752 13.8878 8.47 14.03L11.47 17.03C11.6106 17.1705 11.8012 17.2493 12 17.2493C12.1988 17.2493 12.3894 17.1705 12.53 17.03L15.53 14.03C15.6037 13.9613 15.6628 13.8785 15.7038 13.7865C15.7448 13.6945 15.7668 13.5952 15.7686 13.4945C15.7704 13.3938 15.7518 13.2938 15.7141 13.2004C15.6764 13.107 15.6203 13.0222 15.549 12.951C15.4778 12.8797 15.393 12.8236 15.2996 12.7859C15.2062 12.7482 15.1062 12.7296 15.0055 12.7314C14.9048 12.7332 14.8055 12.7552 14.7135 12.7962C14.6215 12.8372 14.5387 12.8963 14.47 12.97L12.75 14.69V9.75Z" fill={color} />
    </Svg>
  );
}

export function FeedbackIcon({ size = 24, color = COLORS.white }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path fillRule="evenodd" clipRule="evenodd" d="M4.848 2.771C7.21613 2.4234 9.60649 2.24927 12 2.25C14.43 2.25 16.817 2.428 19.152 2.77C21.13 3.062 22.5 4.794 22.5 6.74V12.76C22.5 14.706 21.13 16.438 19.152 16.73C17.9983 16.8991 16.8389 17.0268 15.676 17.113C15.6168 17.1169 15.5593 17.1342 15.5079 17.1637C15.4564 17.1931 15.4123 17.2339 15.379 17.283L12.624 21.416C12.5555 21.5187 12.4627 21.6029 12.3539 21.6612C12.245 21.7194 12.1235 21.7499 12 21.7499C11.8765 21.7499 11.755 21.7194 11.6461 21.6612C11.5373 21.6029 11.4445 21.5187 11.376 21.416L8.621 17.283C8.58768 17.2339 8.54361 17.1931 8.49214 17.1637C8.44068 17.1342 8.38317 17.1169 8.324 17.113C7.16113 17.0265 6.00172 16.8984 4.848 16.729C2.87 16.439 1.5 14.705 1.5 12.759V6.741C1.5 4.795 2.87 3.061 4.848 2.771ZM6.75 8.25C6.75 8.05109 6.82902 7.86032 6.96967 7.71967C7.11032 7.57902 7.30109 7.5 7.5 7.5H16.5C16.6989 7.5 16.8897 7.57902 17.0303 7.71967C17.171 7.86032 17.25 8.05109 17.25 8.25C17.25 8.44891 17.171 8.63968 17.0303 8.78033C16.8897 8.92098 16.6989 9 16.5 9H7.5C7.30109 9 7.11032 8.92098 6.96967 8.78033C6.82902 8.63968 6.75 8.44891 6.75 8.25ZM7.5 10.5C7.30109 10.5 7.11032 10.579 6.96967 10.7197C6.82902 10.8603 6.75 11.0511 6.75 11.25C6.75 11.4489 6.82902 11.6397 6.96967 11.7803C7.11032 11.921 7.30109 12 7.5 12H12C12.1989 12 12.3897 11.921 12.5303 11.7803C12.671 11.6397 12.75 11.4489 12.75 11.25C12.75 11.0511 12.671 10.8603 12.5303 10.7197C12.3897 10.579 12.1989 10.5 12 10.5H7.5Z" fill={color} />
    </Svg>
  );
}

export function SignOutIcon({ size = 24, color = COLORS.white }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path fillRule="evenodd" clipRule="evenodd" d="M16.5 3.75C16.8978 3.75 17.2794 3.90804 17.5607 4.18934C17.842 4.47064 18 4.85218 18 5.25V18.75C18 19.1478 17.842 19.5294 17.5607 19.8107C17.2794 20.092 16.8978 20.25 16.5 20.25H10.5C10.1022 20.25 9.72064 20.092 9.43934 19.8107C9.15804 19.5294 9 19.1478 9 18.75V15C9 14.8011 8.92098 14.6103 8.78033 14.4697C8.63968 14.329 8.44891 14.25 8.25 14.25C8.05109 14.25 7.86032 14.329 7.71967 14.4697C7.57902 14.6103 7.5 14.8011 7.5 15V18.75C7.5 19.5456 7.81607 20.3087 8.37868 20.8713C8.94129 21.4339 9.70435 21.75 10.5 21.75H16.5C17.2956 21.75 18.0587 21.4339 18.6213 20.8713C19.1839 20.3087 19.5 19.5456 19.5 18.75V5.25C19.5 4.45435 19.1839 3.69129 18.6213 3.12868C18.0587 2.56607 17.2956 2.25 16.5 2.25H10.5C9.70435 2.25 8.94129 2.56607 8.37868 3.12868C7.81607 3.69129 7.5 4.45435 7.5 5.25V9C7.5 9.19891 7.57902 9.38968 7.71967 9.53033C7.86032 9.67098 8.05109 9.75 8.25 9.75C8.44891 9.75 8.63968 9.67098 8.78033 9.53033C8.92098 9.38968 9 9.19891 9 9V5.25C9 4.85218 9.15804 4.47064 9.43934 4.18934C9.72064 3.90804 10.1022 3.75 10.5 3.75H16.5ZM5.78 8.47C5.63937 8.32955 5.44875 8.25066 5.25 8.25066C5.05125 8.25066 4.86063 8.32955 4.72 8.47L1.72 11.47C1.57955 11.6106 1.50066 11.8012 1.50066 12C1.50066 12.1988 1.57955 12.3894 1.72 12.53L4.72 15.53C4.86217 15.6625 5.05022 15.7346 5.24452 15.7312C5.43882 15.7277 5.62421 15.649 5.76162 15.5116C5.89903 15.3742 5.97775 15.1888 5.98117 14.9945C5.9846 14.8002 5.91248 14.6122 5.78 14.47L4.06 12.75H15C15.1989 12.75 15.3897 12.671 15.5303 12.5303C15.671 12.3897 15.75 12.1989 15.75 12C15.75 11.8011 15.671 11.6103 15.5303 11.4697C15.3897 11.329 15.1989 11.25 15 11.25H4.06L5.78 9.53C5.92045 9.38937 5.99934 9.19875 5.99934 9C5.99934 8.80125 5.92045 8.61063 5.78 8.47Z" fill={color} />
    </Svg>
  );
}

// Rounded warning triangle + exclamation (auth ERROR screen, Figma 238:1328).
export function ErrorTriangleIcon({ size = 88, color = COLORS.danger }: IconProps) {
  // The "!" is CUT OUT of the triangle via a mask — fully transparent, so the
  // frosted veil shows through it instead of a painted dark glyph (WAV-45).
  // Cutout geometry mirrors the old strokes: 7px round-cap bar 30→50, 8px
  // round dot at 60.75.
  return (
    <Svg width={size} height={(size * 78) / 88} viewBox="0 0 88 78" fill="none">
      <Defs>
        <Mask id="bangCut" maskUnits="userSpaceOnUse" x={0} y={0} width={88} height={78}>
          <Rect width={88} height={78} fill="#fff" />
          <Rect x={40.5} y={26.5} width={7} height={27} rx={3.5} fill="#000" />
          <Circle cx={44} cy={60.75} r={4} fill="#000" />
        </Mask>
      </Defs>
      <G mask="url(#bangCut)">
        <Path d="M44 10 L78 68 H10 Z" fill={color} stroke={color} strokeWidth={16} strokeLinejoin="round" />
      </G>
    </Svg>
  );
}
