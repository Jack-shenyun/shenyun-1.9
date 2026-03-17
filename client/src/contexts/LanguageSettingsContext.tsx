import { trpc } from "@/lib/trpc";
import {
  applyLanguageSettings,
  DEFAULT_LANGUAGE_SETTINGS,
  LANGUAGE_SETTINGS_STORAGE_KEY,
  normalizeLanguageSettings,
  parseLanguageSettings,
  resolveEffectiveLanguage,
  type LanguageSettings,
} from "@/lib/languageSettings";
import {
  disableRuntimePageTranslator,
  enableRuntimePageTranslator,
} from "@/lib/runtimePageTranslator";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

interface LanguageSettingsContextValue {
  settings: LanguageSettings;
  updateSettings: (settings: LanguageSettings) => void;
  resetSettings: () => void;
}

const LanguageSettingsContext = createContext<LanguageSettingsContextValue | undefined>(undefined);

export function LanguageSettingsProvider({ children }: { children: React.ReactNode }) {
  const shouldLoadServerSettings =
    typeof window !== "undefined" && !window.location.pathname.startsWith("/login");
  const { data: company } = trpc.companyInfo.get.useQuery(undefined, {
    enabled: shouldLoadServerSettings,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const [settings, setSettings] = useState<LanguageSettings>(() => {
    if (typeof window === "undefined") return DEFAULT_LANGUAGE_SETTINGS;
    const local = parseLanguageSettings(window.localStorage.getItem(LANGUAGE_SETTINGS_STORAGE_KEY));
    return local || DEFAULT_LANGUAGE_SETTINGS;
  });

  useEffect(() => {
    applyLanguageSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (typeof window === "undefined" || !shouldLoadServerSettings) return;

    const effectiveLanguage = resolveEffectiveLanguage(settings);
    if (!/^en/i.test(effectiveLanguage)) {
      disableRuntimePageTranslator();
      return;
    }

    // 实时页面翻译只走本地术语词典，避免大页面触发大量 AI 请求导致卡顿。
    // 英文打印与研发文档翻译仍保留 AI 翻译。
    enableRuntimePageTranslator();

    return () => {
      disableRuntimePageTranslator();
    };
  }, [settings, shouldLoadServerSettings]);

  useEffect(() => {
    const serverSettings = parseLanguageSettings((company as any)?.languageSettings);
    if (!serverSettings) return;
    setSettings(serverSettings);
  }, [company]);

  const value = useMemo<LanguageSettingsContextValue>(
    () => ({
      settings,
      updateSettings: (nextSettings) => {
        setSettings(normalizeLanguageSettings(nextSettings));
      },
      resetSettings: () => {
        setSettings(DEFAULT_LANGUAGE_SETTINGS);
      },
    }),
    [settings]
  );

  return (
    <LanguageSettingsContext.Provider value={value}>
      {children}
    </LanguageSettingsContext.Provider>
  );
}

export function useLanguageSettings() {
  const context = useContext(LanguageSettingsContext);
  if (!context) {
    throw new Error("useLanguageSettings must be used within LanguageSettingsProvider");
  }
  return context;
}
