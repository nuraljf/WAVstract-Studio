import {
  Geist_300Light,
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  useFonts,
} from '@expo-google-fonts/geist';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';

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

  // Paint the native root window dark so the area behind the home indicator /
  // Android nav bar never flashes white (the bottom white-bar fix).
  useEffect(() => {
    SystemUI.setBackgroundColorAsync('#050505').catch(() => {});
  }, []);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#050505' }}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#050505' },
          }}
        />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
