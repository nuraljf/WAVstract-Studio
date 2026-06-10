import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View, type ViewProps } from 'react-native';

/**
 * Timeline card — component 1 of the WAVstract Studio design.
 * Figma node 199:20 (file w5JZnDnTXRCFNTiaDgtpk8).
 *
 * Layout (all values taken directly from the Figma frame):
 *  - card: 362×196, 20px padding, 34px radius, glass fill + white edge + drop shadow
 *  - audio visualizer: 70px tall, 90 waveform bars (exact heights below) + playhead
 *  - time row: 7 evenly-spaced "0:00" labels
 *  - interactables: play button (50×50), elapsed/total time, "Save WAV" pill
 */

const ACCENT = '#1a62ff';

// Exact bar heights from the Figma `waves` group (nodes 199:25 → 199:114), in px.
// The visualizer is 70px tall; bars are vertically centred.
const WAVEFORM: number[] = [
  3.0, 4.0, 5.0, 8.5, 5.5, 12.0, 11.5, 14.5, 10.0, 19.6, 14.0, 21.1, 33.1, 24.6,
  24.1, 25.1, 19.6, 22.6, 34.6, 26.6, 24.1, 33.1, 28.6, 28.6, 18.6, 19.6, 22.6,
  25.1, 32.1, 21.1, 26.6, 18.1, 28.6, 14.0, 27.1, 20.1, 13.5, 11.0, 13.5, 15.5,
  9.5, 8.0, 15.5, 12.5, 7.0, 7.0, 7.0, 8.5, 9.0, 5.5, 7.5, 6.5, 6.5, 12.5, 7.5,
  9.0, 8.5, 7.0, 11.0, 11.0, 9.0, 11.5, 13.0, 15.5, 13.0, 13.0, 19.6, 20.1, 11.0,
  11.5, 17.6, 18.1, 17.6, 19.1, 12.0, 10.5, 10.0, 13.5, 11.0, 12.0, 15.0, 10.5,
  10.0, 8.0, 11.0, 8.5, 7.5, 6.5, 4.5, 3.0,
];

export type TimelineCardProps = ViewProps & {
  /** Elapsed time label, e.g. "00:00". */
  currentTime?: string;
  /** Total duration label, e.g. "00:00". */
  duration?: string;
  /** Labels under the waveform (Figma shows 7 × "0:00"). */
  timeMarks?: string[];
  /** Waveform bar heights in px. Defaults to the Figma design data. */
  waveform?: number[];
  /** Playhead position as a fraction of the track width (0–1). */
  progress?: number;
  isPlaying?: boolean;
  onPlayPress?: () => void;
  onSavePress?: () => void;
};

export function TimelineCard({
  currentTime = '00:00',
  duration = '00:00',
  timeMarks = ['0:00', '0:00', '0:00', '0:00', '0:00', '0:00', '0:00'],
  waveform = WAVEFORM,
  progress = 0,
  isPlaying = false,
  onPlayPress,
  onSavePress,
  style,
  ...rest
}: TimelineCardProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {/* Audio visualizer */}
      <View style={styles.visualizer}>
        <View style={styles.waves}>
          {waveform.map((h, i) => (
            <View key={i} style={[styles.bar, { height: h }]} />
          ))}
        </View>
        <View
          style={[
            styles.playhead,
            { left: `${Math.min(Math.max(progress, 0), 1) * 100}%` },
          ]}
        />
      </View>

      {/* Time marks */}
      <View style={styles.timeRow}>
        {timeMarks.map((mark, i) => (
          <Text key={i} style={styles.timeMark}>
            {mark}
          </Text>
        ))}
      </View>

      {/* Interactables */}
      <View style={styles.interactables}>
        <Pressable
          onPress={onPlayPress}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          style={({ pressed }) => [styles.playButton, pressed && styles.pressed]}
        >
          <SymbolView
            name={isPlaying ? 'pause.fill' : 'play.fill'}
            size={24}
            tintColor="#ffffff"
            weight="medium"
          />
        </Pressable>

        <Text style={styles.elapsed} numberOfLines={1}>
          {currentTime}
          <Text style={styles.duration}> / {duration}</Text>
        </Text>

        <View style={styles.saveSlot}>
          <Pressable
            onPress={onSavePress}
            accessibilityRole="button"
            accessibilityLabel="Save WAV"
            style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
          >
            <SymbolView
              name="square.and.arrow.down"
              size={20}
              tintColor="#ffffff"
              weight="medium"
            />
            <Text style={styles.saveLabel}>Save WAV</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 362,
    padding: 20,
    gap: 10,
    borderRadius: 34,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    // shadow: 0px 2px 8px 2px rgba(0,0,0,0.1)
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  // Audio visualizer (199:23)
  visualizer: {
    height: 70,
    width: '100%',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  waves: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: 70,
  },
  bar: {
    width: 1.5,
    borderRadius: 1,
    backgroundColor: '#ffffff',
  },
  playhead: {
    position: 'absolute',
    width: 2,
    height: 50,
    borderRadius: 1,
    backgroundColor: ACCENT,
  },

  // Time marks (199:116)
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  timeMark: {
    fontSize: 12,
    color: '#ffffff',
    textAlign: 'center',
  },

  // Interactables (199:124)
  interactables: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  playButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  elapsed: {
    fontSize: 20,
    color: '#ffffff',
  },
  duration: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  saveSlot: {
    flex: 1,
    alignItems: 'flex-end',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: ACCENT,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  saveLabel: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
});
