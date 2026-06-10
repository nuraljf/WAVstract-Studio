import { DevTools, StudioScreen, StudioProvider } from '@/components/studio';

export default function HomeScreen() {
  return (
    <StudioProvider>
      <DevTools>
        <StudioScreen />
      </DevTools>
    </StudioProvider>
  );
}
