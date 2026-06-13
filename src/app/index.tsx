import {
  AuthProvider, useAuth,
  DevTools, DevModeProvider, StudioScreen, StudioProvider, OnboardingScreen, LoadingScreen,
  PageTransition,
} from '@/components/studio';

// Gate: restoring session → loading bars; no session and not a guest → the
// onboarding sign-in screen; otherwise the studio. Screen changes resize in
// through the shared blur transition (WAV-47).
function Gate() {
  const { booting, session, guest } = useAuth();
  const screen = booting ? 'boot' : !session && !guest ? 'onboarding' : 'studio';
  return (
    <PageTransition id={screen}>
      {booting ? (
        <LoadingScreen />
      ) : !session && !guest ? (
        <OnboardingScreen />
      ) : (
        <StudioProvider>
          <DevModeProvider>
            <DevTools>
              <StudioScreen />
            </DevTools>
          </DevModeProvider>
        </StudioProvider>
      )}
    </PageTransition>
  );
}

export default function HomeScreen() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
