import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TimelineCard } from '@/components/timeline-card';

/** Preview route for component 1 (Timeline card). */
export default function TimelineCardPreview() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.center}>
        <TimelineCard
          currentTime="00:00"
          duration="00:00"
          progress={0.01}
          onPlayPress={() => {}}
          onSavePress={() => {}}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
});
