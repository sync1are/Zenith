import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSpotifyStore } from "../store/useSpotifyStore";
import { useSettingsStore, ThemeKey } from "../store/useSettingsStore";
import { useMessageStore } from "../store/useMessageStore";
import { useAppStore } from "../store/useAppStore";
import ThemeGrid from "../components/ThemeGrid";
import {
  User,
  Settings,
  Palette,
  Target,
  Bell,
  Music,
  Database,
  LogOut,
  Upload,
  X,
  Check,
  ChevronRight,
  Download,
  Trash2,
  RotateCcw,
  Loader2,
} from "lucide-react";

// ============================================
// SETTINGS CATEGORIES
// ============================================
const CATEGORIES = [
  { id: "profile", label: "Profile", icon: User, desc: "Your identity" },
  { id: "general", label: "General", icon: Settings, desc: "App behavior" },
  { id: "appearance", label: "Appearance", icon: Palette, desc: "Theme & effects" },
  { id: "focus", label: "Focus", icon: Target, desc: "Productivity" },
  { id: "notifications", label: "Notifications", icon: Bell, desc: "Alerts" },
  { id: "music", label: "Music", icon: Music, desc: "Spotify" },
  { id: "data", label: "Data", icon: Database, desc: "Export & reset" },
  { id: "account", label: "Account", icon: LogOut, desc: "Session" },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

// ============================================
// REUSABLE PRIMITIVES
// ============================================
const SettingRow: React.FC<{
  label: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ label, hint, children }) => (
  <div className="flex items-center justify-between py-4 border-b border-white/5 last:border-0">
    <div className="flex-1 mr-4">
      <p className="font-medium text-[var(--text)]">{label}</p>
      {hint && <p className="text-sm text-[var(--subtle)] mt-0.5">{hint}</p>}
    </div>
    {children}
  </div>
);

const Toggle: React.FC<{
  enabled: boolean;
  onChange: (v: boolean) => void;
}> = ({ enabled, onChange }) => (
  <button
    type="button"
    aria-pressed={enabled}
    onClick={() => onChange(!enabled)}
    className={`
      relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300
      focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]
      ${enabled ? "bg-[var(--accent)]" : "bg-white/10"}
    `}
  >
    <span
      className={`
        inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-all duration-300
        ${enabled ? "translate-x-6" : "translate-x-1"}
      `}
    />
  </button>
);

const GlassCard: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <div
    className={`
      relative rounded-2xl overflow-hidden
      bg-gradient-to-br from-white/[0.07] to-white/[0.02]
      border border-white/10
      backdrop-blur-xl
      shadow-[0_8px_32px_rgba(0,0,0,0.3)]
      ${className}
    `}
  >
    {/* Subtle top highlight */}
    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    {children}
  </div>
);

// Smooth height animation wrapper
const AnimatedHeight: React.FC<{ children: React.ReactNode; activeKey: string }> = ({ children, activeKey }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  const isFirstRender = useRef(true);

  useLayoutEffect(() => {
    if (!contentRef.current) return;

    const newHeight = contentRef.current.scrollHeight;

    if (isFirstRender.current) {
      // On first render, just set the height without animation
      setHeight(newHeight);
      isFirstRender.current = false;
    } else {
      // Animate to new height
      setHeight(newHeight);
    }
  }, [activeKey]);

  // Re-measure on window resize
  useEffect(() => {
    const handleResize = () => {
      if (contentRef.current) {
        setHeight(contentRef.current.scrollHeight);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        height: height === "auto" ? "auto" : `${height}px`,
        transition: isFirstRender.current ? "none" : "height 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
        overflow: "hidden",
      }}
    >
      <div ref={contentRef}>
        {children}
      </div>
    </div>
  );
};

// ============================================
// AVATAR UPLOADER COMPONENT
// ============================================
const AvatarUploader: React.FC<{
  objectUrl: string | null;
  setObjectUrl: (url: string | null) => void;
  onUpload: (file: File) => Promise<void>;
}> = ({ objectUrl, setObjectUrl, onUpload }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    return () => {
      if (objectUrl && objectUrl.startsWith("blob:")) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const openPicker = () => inputRef.current?.click();

  const onFile = async (file: File) => {
    setError("");
    setSuccess(false);
    const valid = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
    if (!valid.includes(file.type)) {
      setError("Unsupported file type. Use PNG, JPG, WEBP, GIF, or SVG.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Max size 5MB.");
      return;
    }

    const url = URL.createObjectURL(file);
    setObjectUrl(url);

    setIsUploading(true);
    try {
      await onUpload(file);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error("Upload failed", err);
      setError(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const onInput: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0];
    if (f) onFile(f);
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  const onRemove = () => {
    if (objectUrl && objectUrl.startsWith("blob:")) URL.revokeObjectURL(objectUrl);
    setObjectUrl(null);
    if (inputRef.current) inputRef.current.value = "";
    setSuccess(false);
    setError("");
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {/* Avatar Preview */}
      <div className="relative group">
        <div
          className={`
            h-24 w-24 rounded-full overflow-hidden
            bg-gradient-to-br from-[var(--accent)]/20 to-[var(--accent)]/5
            border-2 border-white/10 shadow-xl
            ${isUploading ? "animate-pulse" : ""}
          `}
        >
          {objectUrl ? (
            <img src={objectUrl} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <User className="h-10 w-10 text-[var(--subtle)]" />
            </div>
          )}
        </div>
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}
        {objectUrl && !isUploading && (
          <button
            onClick={onRemove}
            className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-rose-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
          >
            <X className="h-3 w-3 text-white" />
          </button>
        )}
      </div>

      {/* Upload Area */}
      <div className="flex-1 w-full">
        <div
          className={`
            flex items-center justify-center gap-4 p-4 rounded-xl
            border-2 border-dashed border-white/10 hover:border-[var(--accent)]/50
            bg-white/[0.02] hover:bg-white/[0.04]
            transition-all duration-300 cursor-pointer
            ${isUploading ? "pointer-events-none opacity-50" : ""}
          `}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={openPicker}
        >
          <Upload className="h-5 w-5 text-[var(--subtle)]" />
          <span className="text-sm text-[var(--subtle)]">
            Drag & drop or <span className="text-[var(--accent)]">browse</span>
          </span>
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onInput} />

        {error && (
          <p className="mt-2 text-xs text-rose-400 flex items-center gap-1">
            <X className="h-3 w-3" /> {error}
          </p>
        )}
        {success && (
          <p className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
            <Check className="h-3 w-3" /> Avatar updated!
          </p>
        )}
        <p className="mt-2 text-xs text-[var(--subtle)]">PNG, JPG, WEBP, GIF, SVG • Max 5MB</p>
      </div>
    </div>
  );
};

// ============================================
// MAIN SETTINGS PAGE
// ============================================
const SettingsPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<CategoryId>("profile");

  // Store hooks
  const spotify = useSpotifyStore((s) => s.spotify);
  const connectSpotify = useSpotifyStore((s) => s.connect);
  const disconnectSpotify = useSpotifyStore((s) => s.disconnect);
  const uploadAvatar = useMessageStore((s) => s.uploadAvatar);
  const currentUser = useMessageStore((s) => s.currentUser);

  const {
    displayName,
    setDisplayName,
    avatarObjectUrl,
    setAvatarFilePreview,
    autoStartTimer,
    setAutoStartTimer,
    animations,
    setAnimations,
    theme,
    setTheme,
    glassMode,
    setGlassMode,
    dailyFocusGoal,
    setDailyFocusGoal,
    breakReminders,
    setBreakReminders,
    desktopNotifications,
    setDesktopNotifications,
    taskCompletedAlerts,
    setTaskCompletedAlerts,
    clickSoundEnabled,
    setClickSoundEnabled,
    resetSettings,
  } = useSettingsStore();

  const displayAvatar = currentUser?.avatar || avatarObjectUrl;

  // Confirmation states
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const resetApp = useAppStore((s) => s.resetApp);

  const onExport = () => {
    const s = useSettingsStore.getState();
    const json = {
      settings: {
        displayName: s.displayName,
        avatarUrl: s.avatarUrl,
        autoStartTimer: s.autoStartTimer,
        animations: s.animations,
        theme: s.theme,
        glassMode: s.glassMode,
        dailyFocusGoal: s.dailyFocusGoal,
        breakReminders: s.breakReminders,
        desktopNotifications: s.desktopNotifications,
        taskCompletedAlerts: s.taskCompletedAlerts,
      },
    };
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: `zenith-settings-${Date.now()}.json`,
    });
    a.click();
    URL.revokeObjectURL(url);
  };

  const onClearAll = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 2200);
      return;
    }
    resetSettings();
    setConfirmClear(false);
  };

  const onResetApp = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 2200);
      return;
    }
    resetApp();
    resetSettings();
    setConfirmReset(false);
  };

  // ========================================
  // CONTENT SECTIONS
  // ========================================
  const renderContent = () => {
    switch (activeCategory) {
      case "profile":
        return (
          <div className="space-y-6">
            <AvatarUploader
              objectUrl={displayAvatar}
              setObjectUrl={setAvatarFilePreview}
              onUpload={uploadAvatar}
            />
            <div className="pt-4">
              <label className="block text-sm font-medium text-[var(--subtle)] mb-2">
                Display Name
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="
                  w-full px-4 py-3 rounded-xl
                  bg-white/5 border border-white/10
                  text-[var(--text)] placeholder:text-[var(--subtle)]
                  focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]
                  transition-all duration-200
                "
              />
            </div>
          </div>
        );

      case "general":
        return (
          <div>
            <SettingRow label="Auto-start Timer" hint="Timer starts automatically when starting a task">
              <Toggle enabled={autoStartTimer} onChange={setAutoStartTimer} />
            </SettingRow>
            <SettingRow label="Animations" hint="Enable motion for transitions and UI feedback">
              <Toggle enabled={animations} onChange={setAnimations} />
            </SettingRow>
            <SettingRow label="Click Sound" hint="Play a soft click sound on every mouse click">
              <Toggle enabled={clickSoundEnabled} onChange={setClickSoundEnabled} />
            </SettingRow>
          </div>
        );

      case "appearance":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-[var(--subtle)] mb-4">Theme</h3>
              <ThemeGrid />
            </div>
            <div className="pt-4 border-t border-white/5">
              <SettingRow label="Glass Mode" hint="Frosted panels and translucency effects">
                <Toggle enabled={glassMode} onChange={setGlassMode} />
              </SettingRow>
            </div>
          </div>
        );

      case "focus":
        return (
          <div>
            <SettingRow label="Daily Focus Goal" hint="Target hours to focus each day">
              <select
                value={dailyFocusGoal}
                onChange={(e) => setDailyFocusGoal(parseInt(e.target.value, 10))}
                className="
                  px-4 py-2 rounded-xl
                  bg-white/5 border border-white/10
                  text-[var(--text)]
                  focus:outline-none focus:border-[var(--accent)]
                  cursor-pointer
                "
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((h) => (
                  <option key={h} value={h} className="bg-[var(--card)]">
                    {h} {h === 1 ? "hour" : "hours"}
                  </option>
                ))}
              </select>
            </SettingRow>
            <SettingRow label="Break Reminders" hint="Get notified when it's time to take a break">
              <Toggle enabled={breakReminders} onChange={setBreakReminders} />
            </SettingRow>
          </div>
        );

      case "notifications":
        return (
          <div>
            <SettingRow label="Desktop Notifications" hint="System-level notifications">
              <Toggle enabled={desktopNotifications} onChange={setDesktopNotifications} />
            </SettingRow>
            <SettingRow label="Task Completed Alerts" hint="Sound when finishing a task">
              <Toggle enabled={taskCompletedAlerts} onChange={setTaskCompletedAlerts} />
            </SettingRow>
          </div>
        );

      case "music":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div
                  className={`
                    h-10 w-10 rounded-full flex items-center justify-center
                    ${spotify?.accessToken ? "bg-emerald-500/20" : "bg-white/5"}
                  `}
                >
                  <Music
                    className={`h-5 w-5 ${spotify?.accessToken ? "text-emerald-400" : "text-[var(--subtle)]"
                      }`}
                  />
                </div>
                <div>
                  <p className="font-medium text-[var(--text)]">Spotify</p>
                  <p className="text-sm text-[var(--subtle)]">
                    {spotify?.accessToken ? "Connected" : "Not connected"}
                  </p>
                </div>
              </div>
              <span
                className={`
                  px-3 py-1 rounded-full text-xs font-medium
                  ${spotify?.accessToken
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  }
                `}
              >
                {spotify?.accessToken ? "Active" : "Inactive"}
              </span>
            </div>

            {spotify?.accessToken ? (
              <button
                onClick={() => disconnectSpotify?.()}
                className="
                  w-full py-3 rounded-xl
                  bg-rose-500/10 border border-rose-500/20
                  text-rose-400 font-medium
                  hover:bg-rose-500/20 transition-colors
                "
              >
                Disconnect Spotify
              </button>
            ) : (
              <button
                onClick={() => connectSpotify?.()}
                className="
                  w-full py-3 rounded-xl
                  bg-emerald-500 text-white font-medium
                  hover:bg-emerald-600 transition-colors
                  shadow-lg shadow-emerald-500/20
                "
              >
                Connect Spotify
              </button>
            )}
          </div>
        );

      case "data":
        return (
          <div className="space-y-4">
            {/* Export */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
              <div className="flex items-center gap-3">
                <Download className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="font-medium text-[var(--text)]">Export Data</p>
                  <p className="text-sm text-[var(--subtle)]">Download settings as JSON</p>
                </div>
              </div>
              <button
                onClick={onExport}
                className="px-4 py-2 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
              >
                Export
              </button>
            </div>

            {/* Clear Settings */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-orange-500/5 border border-orange-500/20">
              <div className="flex items-center gap-3">
                <Trash2 className="h-5 w-5 text-orange-400" />
                <div>
                  <p className="font-medium text-orange-300">Clear Settings</p>
                  <p className="text-sm text-[var(--subtle)]">Reset preferences only</p>
                </div>
              </div>
              <button
                onClick={onClearAll}
                className={`
                  px-4 py-2 rounded-lg font-medium transition-all
                  ${confirmClear
                    ? "bg-orange-500 text-white animate-pulse"
                    : "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30"
                  }
                `}
              >
                {confirmClear ? "Confirm?" : "Clear"}
              </button>
            </div>

            {/* Reset All */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-rose-500/5 border border-rose-500/20">
              <div className="flex items-center gap-3">
                <RotateCcw className="h-5 w-5 text-rose-400" />
                <div>
                  <p className="font-medium text-rose-300">Reset All Data</p>
                  <p className="text-sm text-[var(--subtle)]">Clear everything permanently</p>
                </div>
              </div>
              <button
                onClick={onResetApp}
                className={`
                  px-4 py-2 rounded-lg font-medium transition-all
                  ${confirmReset
                    ? "bg-rose-500 text-white animate-pulse"
                    : "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
                  }
                `}
              >
                {confirmReset ? "⚠️ Confirm?" : "Reset"}
              </button>
            </div>
          </div>
        );

      case "account":
        return (
          <div>
            <button
              onClick={() => useMessageStore.getState().logout()}
              className="
                w-full py-4 rounded-xl
                bg-rose-500/10 border border-rose-500/20
                text-rose-400 font-medium
                hover:bg-rose-500/20 transition-all
                flex items-center justify-center gap-3
              "
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const activeItem = CATEGORIES.find((c) => c.id === activeCategory);

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6">
      {/* Sidebar */}
      <GlassCard className="lg:w-64 flex-shrink-0">
        <div className="p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--subtle)] px-3 mb-3">
            Settings
          </h2>
          <nav className="space-y-1">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                    transition-all duration-200 group
                    ${isActive
                      ? "bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/20"
                      : "text-[var(--subtle)] hover:text-[var(--text)] hover:bg-white/5"
                    }
                  `}
                >
                  <Icon className={`h-5 w-5 ${isActive ? "text-white" : "text-[var(--subtle)] group-hover:text-[var(--accent)]"}`} />
                  <span className="font-medium flex-1 text-left">{cat.label}</span>
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-50"
                      }`}
                  />
                </button>
              );
            })}
          </nav>
        </div>
      </GlassCard>

      {/* Content */}
      <GlassCard className="flex-1 min-w-0">
        <div className="p-6">
          {/* Header */}
          <div className="mb-6 pb-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              {activeItem && <activeItem.icon className="h-6 w-6 text-[var(--accent)]" />}
              <div>
                <h1 className="text-xl font-bold text-[var(--text)]">{activeItem?.label}</h1>
                <p className="text-sm text-[var(--subtle)]">{activeItem?.desc}</p>
              </div>
            </div>
          </div>

          {/* Section Content with smooth height animation */}
          <AnimatedHeight activeKey={activeCategory}>
            <div key={activeCategory} className="animate-slideIn">
              {renderContent()}
            </div>
          </AnimatedHeight>
        </div>
      </GlassCard>

      {/* Inline animation keyframes */}
      <style>{`
        @keyframes slideIn {
          0% { 
            opacity: 0; 
            transform: translateX(16px);
          }
          100% { 
            opacity: 1; 
            transform: translateX(0);
          }
        }
        .animate-slideIn {
          animation: slideIn 0.35s cubic-bezier(0.22, 1, 0.36, 1);
        }
      `}</style>
    </div>
  );
};

export default SettingsPage;
