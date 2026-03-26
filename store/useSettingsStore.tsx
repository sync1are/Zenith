// src/store/useSettingsStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeKey = 'system' | 'light' | 'dark' | 'midnight' | 'contrast';

type SettingsState = {
  // Profile
  displayName: string;
  avatarUrl: string | null;         // persistent (server)
  avatarObjectUrl: string | null;   // local previews only

  // Preferences
  theme: ThemeKey;
  glassMode: boolean;
  animations: boolean;
  autoStartTimer: boolean;

  // Productivity
  dailyFocusGoal: number;
  breakReminders: boolean;

  // Notifications
  desktopNotifications: boolean;
  taskCompletedAlerts: boolean;

  // Audio
  clickSoundEnabled: boolean;
};

type SettingsActions = {
  // Profile
  setDisplayName: (v: string) => void;
  setAvatarUrl: (url: string | null) => void;
  setAvatarFilePreview: (objectUrl: string | null) => void;

  // Prefs
  setTheme: (t: ThemeKey) => void;
  setGlassMode: (v: boolean) => void;
  setAnimations: (v: boolean) => void;
  setAutoStartTimer: (v: boolean) => void;

  // Productivity
  setDailyFocusGoal: (h: number) => void;
  setBreakReminders: (v: boolean) => void;

  // Notifications
  setDesktopNotifications: (v: boolean) => void;
  setTaskCompletedAlerts: (v: boolean) => void;

  // Audio
  setClickSoundEnabled: (v: boolean) => void;

  // Theme Helpers
  applyThemeToDom: (t?: ThemeKey) => void;
  startSystemThemeSync: () => () => void;

  // Reset
  resetSettings: () => void;
};

// Default
const initial: SettingsState = {
  displayName: '',
  avatarUrl: null,
  avatarObjectUrl: null,

  // THEME DEFAULT
  theme: 'dark',

  glassMode: false,
  animations: true,
  autoStartTimer: true,

  dailyFocusGoal: 3,
  breakReminders: true,

  desktopNotifications: true,
  taskCompletedAlerts: true,

  clickSoundEnabled: false,
};

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set, get) => ({
      ...initial,

      // ──────────────────────────────
      // Profile
      // ──────────────────────────────
      setDisplayName: (v) => set({ displayName: v }),
      setAvatarUrl: (url) => set({ avatarUrl: url }),
      setAvatarFilePreview: (objectUrl) => set({ avatarObjectUrl: objectUrl }),

      // ──────────────────────────────
      // Preferences
      // ──────────────────────────────
      setTheme: (t) => {
        set({ theme: t });
        queueMicrotask(() => get().applyThemeToDom(t));
      },
      setGlassMode: (v) => {
        set({ glassMode: v });
        queueMicrotask(() => get().applyThemeToDom());
      },
      setAnimations: (v) => {
        set({ animations: v });
        queueMicrotask(() => get().applyThemeToDom());
      },
      setAutoStartTimer: (v) => set({ autoStartTimer: v }),

      // ──────────────────────────────
      // Productivity
      // ──────────────────────────────
      setDailyFocusGoal: (h) => set({ dailyFocusGoal: h }),
      setBreakReminders: (v) => set({ breakReminders: v }),

      // ──────────────────────────────
      // Notifications
      // ──────────────────────────────
      setDesktopNotifications: (v) => set({ desktopNotifications: v }),
      setTaskCompletedAlerts: (v) => set({ taskCompletedAlerts: v }),

      // ──────────────────────────────
      // Audio
      // ──────────────────────────────
      setClickSoundEnabled: (v) => set({ clickSoundEnabled: v }),

      // ──────────────────────────────
      // Theme Engine (Core)
      // ──────────────────────────────
      applyThemeToDom: (t) => {
        if (typeof document === 'undefined') return;
        const root = document.documentElement;
        const theme = t ?? get().theme;
        let isDark = false;

        if (theme === 'system') {
          const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
          isDark = prefersDark;
          // For system, set data-theme to light/dark for variable consistency
          root.dataset.theme = prefersDark ? 'dark' : 'light';
        } else {
          isDark = theme !== 'light';
          root.dataset.theme = theme;
        }

        if (isDark) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }

        // Motion toggle → CSS hook
        if (get().animations) root.classList.remove('reduce-motion');
        else root.classList.add('reduce-motion');

        // Glass toggle → CSS hook
        if (get().glassMode) root.classList.add('glass-on');
        else root.classList.remove('glass-on');
      },

      // SYSTEM THEME LIVE UPDATES
      startSystemThemeSync: () => {
        if (typeof window === 'undefined') return () => { };
        const mql = window.matchMedia('(prefers-color-scheme: dark)');

        const handler = () => {
          if (get().theme === 'system') get().applyThemeToDom('system');
        };

        mql.addEventListener?.('change', handler);

        return () => mql.removeEventListener?.('change', handler);
      },

      // ──────────────────────────────
      // Reset
      // ──────────────────────────────
      resetSettings: () => {
        const prevBlob = get().avatarObjectUrl;
        if (prevBlob) URL.revokeObjectURL(prevBlob);

        set({ ...initial });

        queueMicrotask(() => get().applyThemeToDom(initial.theme));
      },
    }),

    {
      name: 'zenith-settings',
      partialize: (s) => ({
        displayName: s.displayName,
        avatarUrl: s.avatarUrl,
        theme: s.theme,
        glassMode: s.glassMode,
        animations: s.animations,
        autoStartTimer: s.autoStartTimer,
        dailyFocusGoal: s.dailyFocusGoal,
        breakReminders: s.breakReminders,
        desktopNotifications: s.desktopNotifications,
        taskCompletedAlerts: s.taskCompletedAlerts,
        clickSoundEnabled: s.clickSoundEnabled,
      }),
      version: 2,
      migrate: (persisted, version) => {
        if (!persisted) return initial;
        return persisted;
      },
    }
  )
);
