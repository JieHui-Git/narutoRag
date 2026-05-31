import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SpoilerMode } from "../api";

interface Settings {
  spoilerMode: SpoilerMode;
  maxEpisode: number;
  completedArcIds: string[];
}

interface SettingsContextValue extends Settings {
  setSpoilerMode: (mode: SpoilerMode) => void;
  setMaxEpisode: (ep: number) => void;
  setCompletedArcIds: (ids: string[]) => void;
}

const defaults: Settings = {
  spoilerMode: "safe",
  maxEpisode: 1,
  completedArcIds: [],
};

const SettingsContext = createContext<SettingsContextValue>({
  ...defaults,
  setSpoilerMode: () => {},
  setMaxEpisode: () => {},
  setCompletedArcIds: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaults);

  // Load saved settings on mount
  useEffect(() => {
    AsyncStorage.getItem("settings").then((raw) => {
      if (raw) setSettings({ ...defaults, ...JSON.parse(raw) });
    });
  }, []);

  // Persist whenever settings change
  useEffect(() => {
    AsyncStorage.setItem("settings", JSON.stringify(settings));
  }, [settings]);

  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        setSpoilerMode: (spoilerMode) =>
          setSettings((s) => ({ ...s, spoilerMode })),
        setMaxEpisode: (maxEpisode) =>
          setSettings((s) => ({ ...s, maxEpisode })),
        setCompletedArcIds: (completedArcIds) =>
          setSettings((s) => ({ ...s, completedArcIds })),
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
