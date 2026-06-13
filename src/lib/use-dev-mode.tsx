// Visibility of the temporary DEV inspector chip (DevTools, WAV-14). The chip
// is handy while building but must disappear when showcasing the app, so this
// exposes a persisted toggle (surfaced in Settings). Defaults to visible.
// Persisted like the guest flag — localStorage on web; in-memory elsewhere.
import React, {
  createContext, useCallback, useContext, useMemo, useState,
} from "react";

const DEV_KEY = "wavstract-dev-visible";

function readDevVisible(): boolean {
  try {
    if (typeof localStorage === "undefined") return true;
    const v = localStorage.getItem(DEV_KEY);
    return v === null ? true : v === "1"; // default ON until explicitly hidden
  } catch {
    return true;
  }
}

type DevModeState = {
  devVisible: boolean;
  setDevVisible: (v: boolean) => void;
};

const DevModeContext = createContext<DevModeState | null>(null);

export function DevModeProvider({ children }: { children: React.ReactNode }) {
  const [devVisible, setVisible] = useState(readDevVisible);
  const setDevVisible = useCallback((v: boolean) => {
    try {
      localStorage.setItem(DEV_KEY, v ? "1" : "0");
    } catch { /* private mode / native */ }
    setVisible(v);
  }, []);
  const value = useMemo<DevModeState>(() => ({ devVisible, setDevVisible }), [devVisible, setDevVisible]);
  return <DevModeContext.Provider value={value}>{children}</DevModeContext.Provider>;
}

// Tolerant of a missing provider: defaults to visible so the chip never gets
// stranded off if DevTools is mounted outside the provider.
export function useDevMode(): DevModeState {
  return useContext(DevModeContext) ?? { devVisible: true, setDevVisible: () => {} };
}
