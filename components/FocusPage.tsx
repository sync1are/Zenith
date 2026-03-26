import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "../store/useAppStore";
import { useFocusStore } from "../store/useFocusStore";
import { TaskStatus, TaskPriority, Priority } from "../types";
import SpotifyCard from "../components/SpotifyCard";
import { PlayIcon, PauseIcon } from "./icons/IconComponents";
import { TaskModal } from "./tasks/TaskModals";
import { useSuperFocus } from "../hooks/useSuperFocus";
import { ENVIRONMENTS } from "../data/environments";
import AmbientPlayer from "./AmbientPlayer";
import SuperFocusEntryModal from "./SuperFocusEntryModal";
import SuperFocusExitModal from "./SuperFocusExitModal";

// ===============================
// 1. Particle Background
// ===============================
const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const DPR = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * DPR);
      canvas.height = Math.floor(window.innerHeight * DPR);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };
    resize();

    const particles: Array<{ x: number; y: number; r: number; dx: number; dy: number; o: number }> = [];
    const count = 60;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: (Math.random() * 2 + 1) * DPR,
        dx: (Math.random() - 0.5) * 0.35 * DPR,
        dy: (Math.random() - 0.5) * 0.35 * DPR,
        o: Math.random() * 0.5 + 0.2,
      });
    }

    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139,92,246,${p.o})`;
        ctx.fill();
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
      });
      raf = requestAnimationFrame(draw);
    };
    draw();

    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none opacity-30" />;
};

// ===============================
// 2. Config & Constants
// ===============================
const FOCUS_MODES = [
  { name: "Pomodoro", duration: 25 * 60, color: "from-orange-500 to-red-500", emoji: "🍅", stops: ["#F97316", "#EF4444"] },
  { name: "Deep Work", duration: 50 * 60, color: "from-purple-500 to-indigo-500", emoji: "🧠", stops: ["#A855F7", "#6366F1"] },
  { name: "Short Break", duration: 5 * 60, color: "from-green-500 to-emerald-500", emoji: "☕", stops: ["#22C55E", "#10B981"] },
  { name: "Long Break", duration: 15 * 60, color: "from-blue-500 to-cyan-500", emoji: "🌴", stops: ["#3B82F6", "#06B6D4"] },
];

// ===============================
// 3. Sub-Components
// ===============================

const ModeSelector: React.FC = () => {
  const focusMode = useAppStore((s) => s.focusMode);
  const setFocusMode = useAppStore((s) => s.setFocusMode);
  const timerActive = useAppStore((s) => s.timerActive);

  return (
    <div className="flex justify-center gap-2.5 lg:gap-3 flex-nowrap">
      {FOCUS_MODES.map((mode) => (
        <button
          key={mode.name}
          onClick={() => setFocusMode(mode.name as typeof focusMode)}
          disabled={timerActive}
          className={`px-4 py-2 rounded-full border backdrop-blur-md transition-all ${focusMode === mode.name
            ? `bg-white/10 border-white/30 text-white shadow-[0_0_0_2px_rgba(255,255,255,0.06)_inset]`
            : `bg-white/5 border-white/15 text-white/70 hover:bg-white/10`
            } ${timerActive ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          <span className="mr-2">{mode.emoji}</span>
          {mode.name}
        </button>
      ))}
    </div>
  );
};

const DurationChips = () => {
  const setFocusMode = useAppStore(s => s.setFocusMode);
  const setTimerRemaining = useAppStore(s => s.setTimerRemaining);
  const options = [15, 25, 50, 90];

  return (
    <div className="flex items-center justify-center gap-3 flex-wrap">
      {options.map(m => (
        <button
          key={m}
          onClick={() => {
            setFocusMode("Deep Work" as any);
            setTimerRemaining(m * 60);
          }}
          className="w-10 h-10 rounded-xl grid place-items-center text-sm font-semibold bg-white/5 border border-white/15 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        >
          {m}
        </button>
      ))}
    </div>
  );
};

// --- Timer Content (The part that swoops in/out) ---
// --- Timer Content (The part that swoops in/out) ---
const TimerContent: React.FC<{ taskId: string | null }> = ({ taskId }) => {
  const tasks = useAppStore((s) => s.tasks);
  const timerRemaining = useAppStore((s) => s.timerRemaining);
  const timerActive = useAppStore((s) => s.timerActive);

  const activeTask = useMemo(() => tasks.find((t) => t.id === taskId), [tasks, taskId]);
  const activeTaskTitle = activeTask?.title || "—";

  // Check if this is a count-up (stopwatch) task (no estimated time)
  // Handle edge cases: undefined, null, 0, empty string, or NaN
  const estimatedMins = activeTask?.estimatedTimeMinutes;
  const isCountUpTask = activeTask && (!estimatedMins || Number(estimatedMins) === 0 || Number.isNaN(Number(estimatedMins)));

  // --- TIMER DISPLAY LOGIC ---
  // For count-up tasks: timerRemaining is the elapsed time (positive, no sign)
  // For countdown tasks: timerRemaining is remaining time (negative = overtime, show + sign)
  const isOvertime = !isCountUpTask && timerRemaining < 0;
  const absRemaining = Math.abs(timerRemaining);
  const minutes = Math.floor(absRemaining / 60).toString().padStart(2, "0");
  const seconds = (absRemaining % 60).toString().padStart(2, "0");

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <p className="uppercase tracking-[0.2em] text-[10px] lg:text-xs text-white/50 font-medium">Current task</p>
      <p className="mt-2 text-sm lg:text-base text-white/80 font-medium max-w-[16rem] truncate text-center px-4">
        {activeTaskTitle}
      </p>
      <div className={`mt-1 text-[4rem] lg:text-[5.5rem] leading-none font-black tracking-tighter font-mono ${isCountUpTask ? "text-green-400" : isOvertime ? "text-red-500 animate-pulse" : "text-white"}`}>
        {isOvertime ? "+" : ""}{minutes}:{seconds}
      </div>
      <p className={`mt-3 text-[9px] lg:text-[10px] uppercase tracking-[0.3em] ${isCountUpTask ? "text-green-400 font-bold" : isOvertime ? "text-red-400 font-bold" : "text-white/40"}`}>
        {isCountUpTask ? "STOPWATCH" : isOvertime ? "OVERTIME" : (timerActive ? "Focus Interval" : "Ready")}
      </p>
    </div>
  );
};

// --- SUPER Focus Toggle Button ---
const SuperFocusToggle: React.FC = () => {
  const superFocus = useSuperFocus();

  return (
    <motion.button
      onClick={() => superFocus.toggle()}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${superFocus.isActive
        ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/50"
        : "bg-white/10 text-white/70 hover:bg-white/15 border border-white/20"
        }`}
    >
      {superFocus.isActive ? (
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          SUPER FOCUS ACTIVE
        </span>
      ) : (
        <span className="flex items-center gap-2">
          🔥 ENTER SUPER FOCUS
        </span>
      )}
    </motion.button>
  );
};

// --- Focus Timer (Handles Arc Animation) ---
const FocusTimer: React.FC<{ direction: number }> = ({ direction }) => {
  const focusMode = useAppStore((s) => s.focusMode);
  const timerRemaining = useAppStore((s) => s.timerRemaining);
  const timerActive = useAppStore((s) => s.timerActive);
  const setTimerActive = useAppStore((s) => s.setTimerActive);
  const resetTimer = useAppStore((s) => s.resetTimer);
  const activeTaskId = useAppStore((s) => s.activeTaskId);

  const modeData = FOCUS_MODES.find((m) => m.name === focusMode) || FOCUS_MODES[0];
  const progress = ((modeData.duration - timerRemaining) / modeData.duration) * 100;

  // --- Arc Transition State Logic ---
  const [displayTaskId, setDisplayTaskId] = useState(activeTaskId);
  const [exitingTaskId, setExitingTaskId] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync activeTaskId changes to our internal transition state
  useEffect(() => {
    if (activeTaskId !== displayTaskId) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      setExitingTaskId(displayTaskId);
      setDisplayTaskId(activeTaskId);

      // Matches the CSS animation duration (600ms)
      timeoutRef.current = setTimeout(() => {
        setExitingTaskId(null);
      }, 550);
    }
  }, [activeTaskId, displayTaskId]);

  // Helper for classes
  const getAnimClass = (type: 'enter' | 'exit') => {
    if (direction >= 0) {
      return type === 'enter' ? 'animate-arc-in-next' : 'animate-arc-out-next';
    } else {
      return type === 'enter' ? 'animate-arc-in-prev' : 'animate-arc-out-prev';
    }
  };

  return (
    <div className="relative flex flex-col items-center">
      {/* Static Ring Container */}
      <div className={`relative w-[22rem] h-[22rem] lg:w-[26rem] lg:h-[26rem] xl:w-[30rem] xl:h-[30rem] mx-auto transition-transform duration-700 ${timerActive ? "animate-oscillate" : ""}`}>
        {/* Halos */}
        <div className="absolute inset-0 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute inset-6 rounded-full bg-white/5 blur-xl" />
        <div className={`absolute inset-0 rounded-full bg-gradient-to-r ${modeData.color} opacity-15 blur-3xl`} />

        {/* SVG Ring (Static) */}
        <svg className="absolute inset-0 w-full h-full transform -rotate-90">
          <circle cx="50%" cy="50%" r="42%" stroke="rgba(255,255,255,0.08)" strokeWidth="12" fill="none" />
          <motion.circle
            cx="50%"
            cy="50%"
            r="42%"
            stroke="url(#gradient)"
            strokeWidth="12"
            fill="none"
            strokeDasharray={2 * Math.PI * 180}
            pathLength={100}
            strokeDashoffset={100 - progress}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-linear"
            initial={{ strokeDashoffset: 100 }}
            animate={{ strokeDashoffset: 100 - progress }}
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={modeData.stops?.[0] || "#A855F7"} />
              <stop offset="100%" stopColor={modeData.stops?.[1] || "#6366F1"} />
            </linearGradient>
          </defs>
        </svg>

        {/* 
           STACKING CONTEXT FOR ANIMATION 
           Changed: Removed 'rounded-full' and 'overflow-hidden'
           Added: 'pointer-events-none' so floating text doesn't block clicks if it flies far
        */}
        <div className="absolute inset-[-100px] grid grid-cols-1 grid-rows-1 items-center justify-center pointer-events-none">
          {/* Exiting Item */}
          {exitingTaskId && (
            <div className={`col-start-1 row-start-1 w-full h-full flex items-center justify-center ${getAnimClass('exit')}`}>
              <TimerContent taskId={exitingTaskId} />
            </div>
          )}

          {/* Entering Item */}
          <div
            key={displayTaskId}
            className={`col-start-1 row-start-1 w-full h-full flex items-center justify-center ${exitingTaskId ? getAnimClass('enter') : ''}`}
          >
            <TimerContent taskId={displayTaskId} />
          </div>
        </div>

        {/* SUPER Focus Toggle Button Positioned Below Timer */}
        <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 z-30 pointer-events-auto">
          <SuperFocusToggle />
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4 mt-20 lg:mt-24 relative z-20">
        <button
          onClick={resetTimer}
          className="p-4 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all backdrop-blur-md group"
          aria-label="Reset"
        >
          <svg className="w-5 h-5 text-white/60 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        <button
          onClick={() => setTimerActive(!timerActive)}
          className={`px-8 py-4 rounded-full font-bold text-white shadow-[0_0_20px_rgba(0,0,0,0.3)] hover:shadow-[0_0_30px_rgba(0,0,0,0.4)] hover:scale-105 transition-all bg-gradient-to-r ${modeData.color} flex items-center gap-3`}
        >
          {timerActive ? (
            <>
              <PauseIcon className="w-5 h-5" />
              <span>Pause Session</span>
            </>
          ) : (
            <>
              <PlayIcon className="w-5 h-5" />
              <span>Initiate Task</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// --- Tasks Panel ---
const FocusTaskCarousel: React.FC<{ onTaskSelect: (idx: number) => void; onAddTask: () => void }> = ({ onTaskSelect, onAddTask }) => {
  const tasks = useAppStore((s) => s.tasks);
  const activeTaskId = useAppStore((s) => s.activeTaskId);
  const startTask = useAppStore((s) => s.startTask);
  const timerActive = useAppStore((s) => s.timerActive);
  const setTimerActive = useAppStore((s) => s.setTimerActive);

  const available = useMemo(() => tasks.filter((t) => t.status !== TaskStatus.Done), [tasks]);

  const handleTaskClick = (taskId: string, idx: number) => {
    if (activeTaskId === taskId && timerActive) return;
    startTask(taskId);
    setTimerActive(true);
    onTaskSelect(idx);
  };

  return (
    <div className="rounded-[22px] p-5 w-full glass-panel select-none flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[11px] font-bold text-white/60 uppercase tracking-[0.2em]">Upcoming Tasks</h3>
        <button className="p-1.5 rounded-lg hover:bg-white/10 transition">
          <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className="space-y-3">
        {available.length === 0 ? (
          <div className="text-center py-8 text-white/40 text-sm">No tasks available</div>
        ) : (
          available.slice(0, 5).map((task, idx) => {
            const isActive = activeTaskId === task.id;
            return (
              <motion.button
                key={task.id}
                onClick={() => handleTaskClick(task.id, idx)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={`w-full text-left p-4 rounded-2xl border transition-all relative group ${isActive ? "bg-white/10 border-white/30" : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-orange-500" />
                )}
                <div className="flex items-center gap-3 pl-2">
                  <div className={`text-sm font-mono font-bold ${isActive ? "text-white" : "text-white/30"}`}>
                    {String(idx + 1).padStart(2, "0")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${isActive ? "text-white" : "text-white/70 group-hover:text-white/90"}`}>
                      {task.title}
                    </p>
                  </div>
                  {isActive && <div className="w-2 h-2 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.6)]" />}
                </div>
              </motion.button>
            );
          })
        )}
      </div>

      <button
        onClick={onAddTask}
        className="w-full py-4 mt-4 rounded-xl border border-dashed border-white/10 text-white/30 hover:text-white/60 hover:border-white/20 hover:bg-white/5 transition text-xs font-bold tracking-wider uppercase"
      >
        + Add New Vector
      </button>
    </div>
  );
};

// --- Session Environment Panel ---
const SessionEnv: React.FC = () => {
  const savedIds = useFocusStore((s) => s.savedEnvironmentIds);
  const activeEnvironmentId = useFocusStore((s) => s.activeEnvironmentId);
  const setActiveEnvironmentId = useFocusStore((s) => s.setActiveEnvironmentId);
  const environmentVolume = useFocusStore((s) => s.environmentVolume);
  const setEnvironmentVolume = useFocusStore((s) => s.setEnvironmentVolume);

  // Import from data/environments
  // const { ENVIRONMENTS } = require("../data/environments");

  const savedEnvironments = useMemo(() => {
    return ENVIRONMENTS.filter((e: any) => savedIds.includes(e.id));
  }, [savedIds]);

  return (
    <div className="rounded-[22px] p-6 glass-panel w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-bold">Session Env</h3>
        {activeEnvironmentId && <span className="text-[10px] text-green-400 font-mono animate-pulse">• ACTIVE</span>}
      </div>

      {savedEnvironments.length === 0 ? (
        <div className="text-center py-4 text-white/40 text-xs">
          No environments selected. Visit the Environment Store to add some.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {savedEnvironments.map((env: any) => (
            <button
              key={env.id}
              onClick={() => setActiveEnvironmentId(activeEnvironmentId === env.id ? null : env.id)}
              className={`p-3 rounded-xl transition-all flex flex-col items-center gap-2 ${activeEnvironmentId === env.id
                ? `bg-gradient-to-br ${env.color || 'from-zinc-700 to-zinc-900'} shadow-lg text-white`
                : "bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80"
                }`}
            >
              <span className="text-2xl filter drop-shadow-md">{env.icon || '🎵'}</span>
              <span className="text-[10px] font-medium uppercase tracking-wide truncate w-full text-center">{env.title.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      )}

      {/* Volume Slider */}
      {activeEnvironmentId && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white/60 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
            <div className="flex-1 relative group">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={environmentVolume}
                onChange={(e) => setEnvironmentVolume(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer outline-none
                  [&::-webkit-slider-thumb]:appearance-none 
                  [&::-webkit-slider-thumb]:w-3.5 
                  [&::-webkit-slider-thumb]:h-3.5 
                  [&::-webkit-slider-thumb]:rounded-full 
                  [&::-webkit-slider-thumb]:bg-white
                  [&::-webkit-slider-thumb]:shadow-lg
                  [&::-webkit-slider-thumb]:transition-transform
                  [&::-webkit-slider-thumb]:hover:scale-110
                  [&::-webkit-slider-thumb]:active:scale-95
                  [&::-moz-range-thumb]:w-3.5 
                  [&::-moz-range-thumb]:h-3.5 
                  [&::-moz-range-thumb]:rounded-full 
                  [&::-moz-range-thumb]:bg-white
                  [&::-moz-range-thumb]:border-0
                  [&::-moz-range-thumb]:shadow-lg
                  hover:bg-white/15 transition-colors"
                style={{
                  background: `linear-gradient(to right, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.3) ${environmentVolume * 100}%, rgba(255,255,255,0.1) ${environmentVolume * 100}%, rgba(255,255,255,0.1) 100%)`
                }}
              />
            </div>
            <span className="text-[10px] font-mono text-white/40 w-8 text-right">{Math.round(environmentVolume * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ===============================
// 4. Main Page Layout
// ===============================
const FocusPage: React.FC<{ onAppClick?: (appId: string) => void }> = ({ onAppClick }) => {
  const [direction, setDirection] = useState(0);
  const lastIndex = useRef(0);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const addTask = useAppStore((s) => s.addTask);
  const superFocus = useSuperFocus();
  void onAppClick;

  const handleTaskSelect = (newIndex: number) => {
    if (newIndex > lastIndex.current) {
      setDirection(1); // Next (CCW motion)
    } else if (newIndex < lastIndex.current) {
      setDirection(-1); // Prev (CW motion)
    }
    lastIndex.current = newIndex;
  };

  const handleSaveTask = (taskData: any) => {
    // Parse duration string to get estimated minutes (e.g., "25 min" -> 25)
    const durationStr = taskData.duration || "25 min";
    const estimatedMinutes = parseInt(durationStr) || 25;

    addTask({
      id: Date.now().toString(),
      title: taskData.title,
      category: taskData.category || "General",
      priority: taskData.priority || Priority.Medium,
      status: TaskStatus.Todo,
      estimatedTimeMinutes: estimatedMinutes,
      timeSpentMinutes: 0,
      remainingTime: estimatedMinutes * 60,
      createdAt: new Date(),
      subtasks: [],
    });
    setIsAddTaskOpen(false);
  };

  return (
    <div className="relative h-full w-full overflow-hidden text-white font-sans selection:bg-purple-500/30">

      <div className="absolute inset-0 -z-20">
        <div className="absolute inset-0 rounded-full blur-3xl opacity-40 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.15),transparent_70%)]" />
        <div className="absolute inset-[-20px] opacity-30 animate-spin-slow bg-[conic-gradient(from_0deg,transparent,rgba(147,51,234,0.1),transparent)]" />
      </div>
      <ParticleBackground />
      <AmbientPlayer />

      {/* Floating Super Focus Session Timer */}
      {superFocus.isActive && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 backdrop-blur-md shadow-lg"
        >
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-orange-400 font-bold">Super Focus</span>
            <span className="text-xl font-mono font-bold text-white">
              {Math.floor(superFocus.elapsed / 60).toString().padStart(2, "0")}:{(superFocus.elapsed % 60).toString().padStart(2, "0")}
            </span>
          </div>
        </motion.div>
      )}

      <div className="relative z-10 h-full w-full flex items-center justify-center p-6 lg:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(500px,1fr)_380px] gap-8 lg:gap-12 w-full max-w-[1600px] items-center">

          {/* LEFT */}
          <div className="flex flex-col justify-center lg:-translate-y-4 gap-6">
            <FocusTaskCarousel onTaskSelect={handleTaskSelect} onAddTask={() => setIsAddTaskOpen(true)} />
          </div>

          {/* CENTER */}
          <div className="flex flex-col items-center justify-center gap-8 lg:gap-10">
            <ModeSelector />
            <FocusTimer direction={direction} />
          </div>

          {/* RIGHT */}
          <div className="flex flex-col justify-center gap-6 lg:translate-y-4">
            <div className="rounded-[22px] glass-panel p-6 w-full">
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-bold mb-4 text-center">Session Duration (m)</h3>
              <DurationChips />
            </div>
            <SessionEnv />
            <div className="w-full">
              <SpotifyCard />
            </div>
          </div>

        </div>
      </div>

      <TaskModal
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
        onSave={handleSaveTask}
      />

      {/* Super Focus Entry Warning Modal */}
      <SuperFocusEntryModal
        isOpen={superFocus.showingEntryModal}
        onConfirmEnter={superFocus.confirmEntry}
        onCancel={superFocus.cancelEntry}
        onDontAskAgain={() => superFocus.setSkipEntryWarning(true)}
      />

      {/* Super Focus Exit Confirmation Modal */}
      <SuperFocusExitModal
        isOpen={superFocus.showingExitModal}
        elapsedMinutes={superFocus.elapsed / 60}
        allTasksComplete={useAppStore.getState().tasks.filter(t => t.status !== TaskStatus.Done).length === 0}
        onConfirmExit={superFocus.confirmExit}
        onCancel={superFocus.cancelExit}
      />

      {/* Styles & Keyframes */}
      <style>{`
        .glass-panel {
          background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
          backdrop-filter: blur(10px) saturate(1.05);
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 8px 30px rgba(15,12,30,0.5);
        }

        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg);} }
        .animate-spin-slow { animation: spin-slow 30s linear infinite; }

        /* ARC ANIMATIONS (Swoop Effect) */
        .animate-arc-in-next { animation: arcInNext 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        .animate-arc-out-next { animation: arcOutNext 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        .animate-arc-in-prev { animation: arcInPrev 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        .animate-arc-out-prev { animation: arcOutPrev 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards; }

        @keyframes arcInNext {
          0% { transform: translate(100%, 20%) rotate(15deg) scale(0.8); opacity: 0; }
          100% { transform: translate(0, 0) rotate(0) scale(1); opacity: 1; }
        }
        @keyframes arcOutNext {
          0% { transform: translate(0, 0) rotate(0) scale(1); opacity: 1; }
          100% { transform: translate(-100%, -20%) rotate(-15deg) scale(0.8); opacity: 0; }
        }
        @keyframes arcInPrev {
          0% { transform: translate(-100%, 20%) rotate(-15deg) scale(0.8); opacity: 0; }
          100% { transform: translate(0, 0) rotate(0) scale(1); opacity: 1; }
        }
        @keyframes arcOutPrev {
          0% { transform: translate(0, 0) rotate(0) scale(1); opacity: 1; }
          100% { transform: translate(100%, -20%) rotate(15deg) scale(0.8); opacity: 0; }
        }

        /* Slow Oscillation (Floating) */
        @keyframes oscillate {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .animate-oscillate {
          animation: oscillate 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default FocusPage;
