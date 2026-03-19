
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ENVIRONMENTS } from "../data/environments";

export type Priority = "HIGH" | "MEDIUM" | "LOW";
export type TaskStatus = "IDLE" | "RUNNING" | "DONE";

export interface Task {
  id: number;
  title: string;
  description?: string;
  duration: number; // in minutes
  category: string;
  priority: Priority;
  status: TaskStatus;
}

export type FocusMode = "Pomodoro" | "Deep Work" | "Short Break" | "Long Break";

interface FocusStore {
  tasks: Task[];
  activeTaskId: number | null;
  focusMode: FocusMode;
  timerRemaining: number; // seconds
  timerActive: boolean;

  // Environment State
  savedEnvironmentIds: string[]; // The 6 selected environments in the dock
  activeEnvironmentId: string | null; // The currently playing environment
  environmentVolume: number; // Global volume for the environment

  // Actions
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  startTask: (taskId: number) => void;
  pauseTask: () => void;
  completeTask: (taskId: number) => void;

  setFocusMode: (mode: FocusMode) => void;
  setTimerRemaining: (seconds: number) => void;
  toggleTimerActive: () => void;
  resetTimer: () => void;

  // Environment Actions
  setSavedEnvironmentIds: (ids: string[]) => void;
  toggleSavedEnvironmentId: (id: string) => void;
  setActiveEnvironmentId: (id: string | null) => void;
  setEnvironmentVolume: (vol: number) => void;
}

// Default durations by focus mode (seconds)
const DURATIONS: Record<FocusMode, number> = {
  "Pomodoro": 25 * 60,
  "Deep Work": 50 * 60,
  "Short Break": 5 * 60,
  "Long Break": 15 * 60,
};

// Default saved environments (first 6)
const DEFAULT_SAVED_IDS = ENVIRONMENTS.slice(0, 6).map(e => e.id);

export const useFocusStore = create<FocusStore>()(
  persist(
    (set, get) => ({
      tasks: [],
      activeTaskId: null,
      focusMode: "Pomodoro",
      timerRemaining: DURATIONS["Pomodoro"],
      timerActive: false,

      savedEnvironmentIds: DEFAULT_SAVED_IDS,
      activeEnvironmentId: 'env-12', // Tropical Beach as default
      environmentVolume: 0.5,

      setTasks: (tasks) => set({ tasks }),

      addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),

      startTask: (taskId) => {
        set((state) => ({
          activeTaskId: taskId,
          timerRemaining: DURATIONS[state.focusMode],
          timerActive: true,
          tasks: state.tasks.map(t =>
            t.id === taskId ? { ...t, status: "RUNNING" } : t.status === "RUNNING" ? { ...t, status: "IDLE" } : t
          ),
        }));
      },

      pauseTask: () => {
        set((state) => ({
          timerActive: false,
          tasks: state.tasks.map(t =>
            t.status === "RUNNING" ? { ...t, status: "IDLE" } : t
          ),
          activeTaskId: null,
        }));
      },

      completeTask: (taskId) => set((state) => ({
        tasks: state.tasks.map(t => t.id === taskId ? { ...t, status: "DONE" } : t),
        activeTaskId: null,
        timerActive: false,
      })),

      setFocusMode: (mode) => {
        set({ focusMode: mode, timerRemaining: DURATIONS[mode], timerActive: false });
      },

      setTimerRemaining: (seconds) => set({ timerRemaining: seconds }),

      toggleTimerActive: () => set((state) => ({ timerActive: !state.timerActive })),

      resetTimer: () => {
        const mode = get().focusMode;
        set({ timerRemaining: DURATIONS[mode], timerActive: false });
      },

      setSavedEnvironmentIds: (ids) => set({ savedEnvironmentIds: ids }),

      toggleSavedEnvironmentId: (id) => set((state) => {
        const current = state.savedEnvironmentIds;
        if (current.includes(id)) {
          return { savedEnvironmentIds: current.filter(i => i !== id) };
        } else {
          if (current.length >= 6) return {}; // Max 6
          return { savedEnvironmentIds: [...current, id] };
        }
      }),

      setActiveEnvironmentId: (id) => set({ activeEnvironmentId: id }),
      setEnvironmentVolume: (vol) => set({ environmentVolume: vol }),
    }),
    {
      name: "zenith-focus-storage",
      partialize: (state) => ({
        savedEnvironmentIds: state.savedEnvironmentIds,
        activeEnvironmentId: state.activeEnvironmentId,
        environmentVolume: state.environmentVolume,
        focusMode: state.focusMode,
        tasks: state.tasks,
      }),
    }
  )
);

