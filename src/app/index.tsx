import {
  AuthProvider, useAuth,
  DevTools, StudioScreen, StudioProvider, OnboardingScreen, LoadingScreen,
} from '@/components/studio';

// Gate: restoring session → loading bars; no session and not a guest → the
// onboarding sign-in screen; otherwise the studio.
function Gate() {
  const { booting, session, guest } = useAuth();
  if (booting) return <LoadingScreen />;
  if (!session && !guest) return <OnboardingScreen />;
  return (
    <StudioProvider>
      <DevTools>
        <StudioScreen />
      </DevTools>
    </StudioProvider>
  );
}

export default function HomeScreen() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
