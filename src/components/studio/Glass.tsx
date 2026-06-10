import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

// The kit's 3-layer inset highlight (node 199:196). Rendered as its own
// top-most overlay layer (matching Figma's separate "stroke" frame) so the
// corner glints show consistently at every size — react-native-web can drop
// later shadows when inset + outset are combined in one container boxShadow.
const INSET_HIGHLIGHT = [
  "inset 0px 0px 2px 0.5px rgba(255,255,255,0.5)",
  "inset 2px 2px 0.5px -2px rgba(255,255,255,0.5)",
  "inset -2px -2px 0.5px -2px rgba(255,255,255,0.5)",
].join(", ");

type Props = { radius?: number; style?: StyleProp<ViewStyle> };

/** Transparent, non-interactive edge highlight. Place as the LAST child of a
 *  glass surface (the container supplies the fill + outer shadow). */
export function GlassEdge({ radius, style }: Props) {
  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        radius != null ? { borderRadius: radius } : null,
        { boxShadow: INSET_HIGHLIGHT } as ViewStyle,
        style,
      ]}
    />
  );
}
