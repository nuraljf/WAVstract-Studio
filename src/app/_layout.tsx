import {
  Geist_300Light,
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  useFonts,
} from '@expo-google-fonts/geist';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// App-like web feel (WAV-54): nothing in the UI is text-selectable and iOS
// long-presses never open the selection/copy callout — it hijacked the DEV
// chip's hold-to-drag and could trigger during swipes.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent =
    '#root, #root * { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }';
  document.head.appendChild(style);
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Geist_300Light,
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
  });
  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#050505' },
        }}
      />
    </GestureHandlerRootView>
  );
}
