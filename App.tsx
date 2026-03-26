import React, { useState, useEffect, useCallback } from "react";
import { Youtube, Calculator, StickyNote, Music, Globe, Sparkles, MessageCircle, PenTool } from "lucide-react";

// UI Components
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import TitleBar from "./components/TitleBar";
import NotificationSystem from "./components/Notifications";
import TopNavBar from "./components/TopNavBar";
import { Window } from "./components/Window";
import { BrowserApp } from "./components/BrowserApp";
import { CalculatorApp } from "./components/CalculatorApp";
import WhiteboardApp from "./components/WhiteboardApp";
import EnvironmentStoreApp from "./components/EnvironmentStoreApp";

// Pages
import Dashboard from "./components/Dashboard";
import Tasks from "./components/TasksPage";
import GoalsPage from "./components/GoalsPage";
import HabitsPage from "./components/HabitsPage";
import CalendarPage from "./components/CalendarPage";
import FocusPage from "./components/FocusPage";
import SettingsPage from "./components/SettingsPage";
import ChatPage from "./components/ChatPage";
import ChatApp from "./components/ChatApp";
import MessagesApp from "./components/MessagesApp";
import LoginPage from "./components/LoginPage";
import SignUpPage from "./components/SignUpPage";
import CompactView from "./components/CompactView";
import JournalPage from "./components/JournalPage";


// Stores
import { useAppStore } from "./store/useAppStore";
import { useSettingsStore } from "./store/useSettingsStore";
import { useSpotifyStore } from "./store/useSpotifyStore";
import { useMessageStore } from "./store/useMessageStore";
import { useCalendarStore } from "./store/useCalendarStore";
import { useFocusStore } from "./store/useFocusStore";
import { useGoalStore } from "./store/useGoalStore";
import { useHabitStore } from "./components/HabitsPage";
import { useJournalStore } from "./store/useJournalStore";
import { handleAuthRedirectIfPresent } from "./auth/spotifyAuth";
import { useFirebaseSync } from "./utils/firebaseSync";
import { playClickSound } from "./utils/clickSound";

// Animations
import { AnimatePresence, motion } from "framer-motion";

import LiveBackground from "./components/LiveBackground";
import StudySessionModal from './components/StudySessionModal';
import UpdateNotification from './components/UpdateNotification';

import MigrationLoadingScreen from './components/MigrationLoadingScreen';
import { doc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from './config/firebase';
import { useMigrationStore } from './store/useMigrationStore';
import { useSuperFocus } from "./hooks/useSuperFocus";
import { useDiscordPresence } from "./hooks/useDiscordPresence";

const App: React.FC = () => {
  // 🌙 Navigation
  const activePage = useAppStore((s) => s.activePage);
  const setActivePage = useAppStore((s) => s.setActivePage);
  const compactMode = useAppStore((s) => s.compactMode);
  const superFocus = useSuperFocus();

  // 🖥️ Detect if running in Electron
  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  // 🎮 Discord Rich Presence
  useDiscordPresence(activePage);

  // 🎯 Window Management State
  const [openWindows, setOpenWindows] = useState<string[]>([]);
  const [minimizedWindows, setMinimizedWindows] = useState<string[]>([]);
  const [activeWindow, setActiveWindow] = useState<string | null>(null);
  const [iconPositions, setIconPositions] = useState<Record<string, DOMRect>>({});
  const [windowZIndices, setWindowZIndices] = useState<Record<string, number>>({});
  const [windowModes, setWindowModes] = useState<Record<string, 'normal' | 'maximized' | 'left' | 'right'>>({});
  const [windowPositions, setWindowPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [showCalculatorLauncher, setShowCalculatorLauncher] = useState(false);
  const baseZIndex = 1000;

  // 🎯 Mini-Apps Configuration
  const dockApps = React.useMemo(() => [
    {
      id: 'browser',
      title: 'Browser',
      icon: Globe,
      width: 1024,
      height: 768,
      component: <BrowserApp />
    },
    {
      id: 'youtube',
      title: 'YouTube',
      icon: Youtube,
      width: 800,
      height: 600,
      component: (
        <webview
          src="https://www.youtube.com"
          className="w-full h-full border-0"
          allowpopups
          webpreferences="contextIsolation=yes, nodeIntegration=no, sandbox=yes"
        />
      )
    },
    {
      id: 'calculator',
      title: 'Calculator',
      icon: Calculator,
      width: 980,
      height: 760,
      component: <CalculatorApp />
    },
    {
      id: 'whiteboard',
      title: 'Whiteboard',
      icon: PenTool,
      width: 1200,
      height: 820,
      component: <WhiteboardApp />
    },
    {
      id: 'notes',
      title: 'Notes',
      icon: StickyNote,
      width: 600,
      height: 500,
      component: (
        <div className="p-4 h-full bg-yellow-50">
          <textarea
            className="w-full h-full bg-transparent border-0 resize-none focus:outline-none text-gray-800"
            placeholder="Start typing your notes..."
          />
        </div>
      )
    },
    {
      id: 'music',
      title: 'Music',
      icon: Music,
      width: 400,
      height: 500,
      component: (
        <div className="flex items-center justify-center h-full bg-gradient-to-br from-purple-600 to-pink-600 text-white">
          <div className="text-center">
            <Music size={48} className="mx-auto mb-4" />
            <p className="text-sm">Music Player coming soon</p>
          </div>
        </div>
      )
    },
    {
      id: 'environment-store',
      title: 'Environment Store',
      icon: Sparkles,
      width: 1200,
      height: 800,
      component: <EnvironmentStoreApp />
    },
    {
      id: 'messages',
      title: 'Messages',
      icon: MessageCircle,
      width: 500,
      height: 600,
      component: <MessagesApp />
    },
  ], []);

  // Handle window actions
  const handleAppClick = useCallback((appId: string) => {
    if (minimizedWindows.includes(appId)) {
      // Un-minimize
      setMinimizedWindows(prev => prev.filter(id => id !== appId));
      setActiveWindow(appId);
    } else if (openWindows.includes(appId)) {
      // Focus if already open
      setActiveWindow(appId);
      // Bring to front
      setWindowZIndices(prev => {
        const maxZ = Math.max(...Object.values(prev), baseZIndex);
        return { ...prev, [appId]: maxZ + 1 };
      });
    } else {
      // Open new window
      setOpenWindows(prev => [...prev, appId]);
      setActiveWindow(appId);
      setWindowZIndices(prev => {
        const maxZ = Math.max(...Object.values(prev), baseZIndex);
        return { ...prev, [appId]: maxZ + 1 };
      });
    }
  }, [minimizedWindows, openWindows, windowZIndices]);

  const handleWindowClose = useCallback((appId: string) => {
    setOpenWindows(prev => prev.filter(id => id !== appId));
    setMinimizedWindows(prev => prev.filter(id => id !== appId));
    setActiveWindow(prev => prev === appId ? null : prev);
  }, []);

  const handleWindowMinimize = useCallback((appId: string) => {
    setMinimizedWindows(prev => [...prev, appId]);
    setActiveWindow(prev => prev === appId ? null : prev);
  }, []);



  const handleWindowMaximize = useCallback((appId: string) => {
    setWindowModes(prev => ({
      ...prev,
      [appId]: prev[appId] === 'maximized' ? 'normal' : 'maximized'
    }));
  }, []);

  const handleWindowSnap = useCallback((appId: string, mode: 'left' | 'right' | 'normal') => {
    setWindowModes(prev => ({
      ...prev,
      [appId]: mode
    }));
  }, []);

  const handleWindowMove = useCallback((appId: string, x: number, y: number) => {
    setWindowPositions(prev => ({
      ...prev,
      [appId]: { x, y }
    }));
  }, []);

  const handleWindowFocus = useCallback((appId: string) => {
    setActiveWindow(appId);
    setWindowZIndices(prev => {
      const maxZ = Math.max(...Object.values(prev), baseZIndex);
      // Only update if not already top
      if (prev[appId] === maxZ) return prev;
      return { ...prev, [appId]: maxZ + 1 };
    });
  }, []);

  useEffect(() => {
    let hideTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleMouseMove = (event: MouseEvent) => {
      const isNearBottomRight =
        event.clientX >= window.innerWidth - 180 &&
        event.clientY >= window.innerHeight - 160;

      if (isNearBottomRight) {
        if (hideTimeout) {
          clearTimeout(hideTimeout);
          hideTimeout = null;
        }
        setShowCalculatorLauncher(true);
        return;
      }

      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }

      hideTimeout = setTimeout(() => {
        setShowCalculatorLauncher(false);
      }, 220);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
    };
  }, []);

  // 🌙 Migration state
  const isMigrating = useMigrationStore((s) => s.isMigrating);

  // Study Session & Personal Call State
  const { studySession, setStudySessionOpen, handleIncomingCall, personalCall, handleIncomingPersonalCall } = useAppStore();

  const [isSignup, setIsSignup] = useState(false);
  const [portfolioAutoLogin, setPortfolioAutoLogin] = useState(false);

  // 🌙 Messaging store
  const currentUser = useMessageStore((s) => s.currentUser);
  const activeUserId = useMessageStore((s) => s.activeUserId);
  const subscribeToUsers = useMessageStore((s) => s.subscribeToUsers);
  const subscribeToMessages = useMessageStore((s) => s.subscribeToMessages);
  const initAuth = useMessageStore((s) => s.initAuth);
  const login = useMessageStore((s) => s.login);
  const isLoading = useMessageStore((s) => s.isLoading);

  // 🌙 Mobile drawer
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(true);

  // 🌙 TopNav Server Tabs
  const [activeServerId, setActiveServerId] = useState("home");

  // 🎵 Click Sound Setting
  const clickSoundEnabled = useSettingsStore((s) => s.clickSoundEnabled);

  // Theme Sync
  useEffect(() => {
    const settings = useSettingsStore.getState();
    const stop = settings.startSystemThemeSync();
    settings.applyThemeToDom();
    return () => stop();
  }, []);

  // 🎵 Global Click Sound Listener
  useEffect(() => {
    if (!clickSoundEnabled) return;

    const handleClick = () => {
      playClickSound();
    };

    // Add global click listener
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [clickSoundEnabled]);

  // 🔥 Firebase Store Sync (only when user is logged in)
  useFirebaseSync({
    collectionName: 'app-state',
    store: useAppStore,
    selector: (state) => ({
      tasks: state.tasks,
      sessionHistory: state.sessionHistory,
      focusMode: state.focusMode,
      timerRemaining: state.timerRemaining,
      activePage: state.activePage,
      spotify: state.spotify,
    }),
  });

  useFirebaseSync({
    collectionName: 'calendar-state',
    store: useCalendarStore,
  });

  useFirebaseSync({
    collectionName: 'settings-state',
    store: useSettingsStore,
  });

  useFirebaseSync({
    collectionName: 'focus-state',
    store: useFocusStore,
    selector: (state) => ({
      savedEnvironmentIds: state.savedEnvironmentIds,
      activeEnvironmentId: state.activeEnvironmentId,
      environmentVolume: state.environmentVolume,
      tasks: state.tasks,
      focusMode: state.focusMode,
      // Don't sync functions or runtime state
    }),
  });

  // Goals Firebase Sync
  useFirebaseSync({
    collectionName: 'goals-state',
    store: useGoalStore,
  });

  // Habits Firebase Sync
  useFirebaseSync({
    collectionName: 'habits-state',
    store: useHabitStore,
  });

  // Journal Firebase Sync
  useFirebaseSync({
    collectionName: 'journal-state',
    store: useJournalStore,
    selector: (state) => ({
      topics: state.topics,
      entries: state.entries,
      drafts: state.drafts,
    }),
  });

  // Initialize Auth
  useEffect(() => {
    const unsub = initAuth();

    // Safety timeout: if Firebase takes too long, stop loading
    const timer = setTimeout(() => {
      if (useMessageStore.getState().isLoading) {
        useMessageStore.setState({ isLoading: false });
      }
    }, 4000);

    return () => {
      unsub();
      clearTimeout(timer);
    };
  }, []);

  // 🌐 Portfolio Auto-Login: skip login screen when loaded with ?portfolioKey=<key>
  useEffect(() => {
    if (isLoading || currentUser) return; // Wait for auth to settle, skip if already logged in

    const params = new URLSearchParams(window.location.search);
    const portfolioKey = params.get('portfolioKey');
    const expectedKey = import.meta.env.VITE_PORTFOLIO_KEY;
    const portfolioEmail = import.meta.env.VITE_PORTFOLIO_EMAIL;
    const portfolioPassword = import.meta.env.VITE_PORTFOLIO_PASSWORD;

    if (portfolioKey && expectedKey && portfolioKey === expectedKey && portfolioEmail && portfolioPassword) {
      setPortfolioAutoLogin(true);
      login(portfolioEmail, portfolioPassword)
        .catch((err) => {
          console.error('Portfolio auto-login failed:', err);
          setPortfolioAutoLogin(false);
        });
    }
  }, [isLoading, currentUser]);

  // Messaging Subscriptions
  // 1. Subscribe to Users
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeToUsers();
    return () => unsubscribe();
  }, [currentUser]);

  // 2. Subscribe to Active Chat Messages
  useEffect(() => {
    if (currentUser && activeUserId) {
      const unsub = subscribeToMessages(activeUserId);
      return () => unsub();
    }
  }, [currentUser, activeUserId]);

  // 3. Subscribe to Notifications (Global)
  const { subscribeToNotifications } = useMessageStore();
  useEffect(() => {
    if (currentUser) {
      const unsub = subscribeToNotifications();
      return () => unsub();
    }
  }, [currentUser]);

  // 4. Listen for incoming calls (Global)
  useEffect(() => {
    if (!currentUser) return;

    // We listen to a specific document for incoming calls
    // This requires a backend trigger or client-side write to `users/{userId}/incoming_call`
    // Since we implemented `sendMessage` with `call_invite` type, we can listen to that?
    // But `sendMessage` writes to `chats/{chatId}/messages`.

    // Ideally, we should have a separate listener for "invites".
    // For now, let's assume the `StudySessionModal` handles the "active" state.
    // But for "ringing", we need to know when someone calls us.

    // If we rely on `call_invite` messages, the user has to be in the chat to see it.
    // To make it global, we need a global listener.

    // Let's implement a simple listener on the user's profile for a "currentCall" field?
    // Or just rely on the chat message notification?

    // Given the constraints, let's stick to the chat message for now.
    // If the user gets a message with type 'call_invite', we could trigger the modal?
    // But we don't have a global message listener for ALL chats.

    // Let's add a listener to `users/{userId}/incoming_call/active`
    const callRef = doc(db, "users", currentUser.id, "incoming_call", "active");
    const unsub = onSnapshot(callRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.sessionCode && !studySession.isOpen) {
          handleIncomingCall(data.sessionCode, data.callerId);
        }
      }
    });

    return () => unsub();
  }, [currentUser, studySession.isOpen]);

  // 5. Listen for incoming personal calls (Global)
  useEffect(() => {
    if (!currentUser) return;

    const callRef = doc(db, "users", currentUser.id, "incoming_personal_call", "active");
    const unsub = onSnapshot(callRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.callId && !personalCall.isActive) {
          // Check if the call is recent (within 5 minutes)
          const callTimestamp = data.timestamp || 0;
          const now = Date.now();
          const fiveMinutesInMs = 5 * 60 * 1000;

          if (now - callTimestamp < fiveMinutesInMs) {
            // Call is recent, show the modal
            handleIncomingPersonalCall(data.callerId, data.callId);
          } else {
            // Call is too old (stale), delete it
            console.log('Ignoring stale call from', new Date(callTimestamp));
            deleteDoc(callRef).catch(err => console.error('Error deleting stale call:', err));
          }
        }
      }
    });

    return () => unsub();
  }, [currentUser, personalCall.isActive]);

  // Tick timer
  useEffect(() => {
    const interval = setInterval(() => useAppStore.getState().tick(), 1000);
    return () => clearInterval(interval);
  }, []);

  // Spotify OAuth
  const acceptTokens = useSpotifyStore((s) => s.acceptOAuthTokens);
  useEffect(() => {
    handleAuthRedirectIfPresent(acceptTokens);
  }, [acceptTokens]);

  // Note: Keyboard blocking removed to allow typing in Super Focus mode
  // The Electron-level kiosk mode still blocks Alt+F4, Ctrl+W, etc.

  // Page switcher
  const renderContent = useCallback(() => {
    switch (activePage) {
      case "Dashboard": return <Dashboard />;
      case "Tasks": return <Tasks />;
      case "Goals": return <GoalsPage />;
      case "Habits": return <HabitsPage />;
      case "Calendar": return <CalendarPage />;
      case "Focus": return <FocusPage onAppClick={handleAppClick} />;
      case "Journal": return <JournalPage />;
      case "Messages": return <ChatApp />;
      case "Settings": return <SettingsPage />;
      default:
        return (
          <div className="p-6 bg-[#1C1C1E] rounded-xl border border-gray-700 text-gray-400">
            Page not implemented.
          </div>
        );
    }
  }, [activePage, handleAppClick]);

  // LOADING STATE (also shown during portfolio auto-login)
  if (isLoading || portfolioAutoLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#111217]">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col text-white relative">
      {/* Auto-Update Notification */}
      <UpdateNotification />

      {/* 🔄 Migration Loading Screen */}
      <MigrationLoadingScreen isVisible={isMigrating} />

      {/* 🌿 Live Environment Background (Fixed z-0) */}
      <LiveBackground />

      {/* Auth Flow */}
      {!currentUser ? (
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          {isSignup ? (
            <SignUpPage onNavigateToLogin={() => setIsSignup(false)} />
          ) : (
            <LoginPage
              onLoginSuccess={() => setActivePage("Dashboard")}
              onNavigateToSignup={() => setIsSignup(true)}
            />
          )}
        </div>
      ) : compactMode ? (
        /* Compact View Mode - render above background */
        <div className="relative z-20">
          <CompactView />
        </div>
      ) : (
        /* Content Wrapper (z-10) */
        <div className="relative z-10 flex flex-col h-full min-h-screen">
          {/* Hide TitleBar in Super Focus Mode and in browser mode */}
          <AnimatePresence>
            {!superFocus.isActive && isElectron && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="z-50"
              >
                <TitleBar />
              </motion.div>
            )}
          </AnimatePresence>
          <NotificationSystem />

          {/* Hide TopNavBar in Super Focus Mode */}
          <AnimatePresence>
            {!superFocus.isActive && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <TopNavBar
                  activeServer={activeServerId}
                  onSelect={(id) => setActiveServerId(id)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-1 overflow-hidden pt-4 relative">

            {/* Hide Sidebar in Super Focus Mode */}
            <AnimatePresence>
              {!superFocus.isActive && (
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="h-full"
                >
                  <Sidebar
                    activeItem={activePage}
                    onSelect={(page) => {
                      setActivePage(page);
                      setIsMobileDrawerOpen(false);
                    }}
                    isMobileDrawerOpen={isMobileDrawerOpen}
                    setIsMobileDrawerOpen={setIsMobileDrawerOpen}
                  />
                </motion.div>
              )}
            </AnimatePresence>


            <main className="flex-1 overflow-y-auto w-full">
              <div className={`max-w-full ${activePage === 'Messages' ? 'px-0 pt-0 pb-0 md:pl-20' : 'px-6 lg:px-10 pt-6 pb-5'} transition-all duration-500 ${!superFocus.isActive && activePage !== 'Messages' ? 'md:pl-24' : 'pl-0'}`}>
                {/* Hide Header in Super Focus Mode or Messages Page */}
                <AnimatePresence>
                  {!superFocus.isActive && activePage !== 'Messages' && (
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3, delay: 0.3 }}
                    >
                      <Header
                        currentPage={activePage}
                        setSidebarOpen={setIsMobileDrawerOpen}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 🚀 ANIMATED PAGE TRANSITION START */}
                {/* 🍃 NATURAL / SUBTLE DRIFT */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activePage}
                    initial={{ opacity: 0, y: 8 }}   // Starts 8px down, invisible
                    animate={{ opacity: 1, y: 0 }}   // Floats up to natural position
                    exit={{ opacity: 0, y: -8 }}     // Floats up and vanishes
                    transition={{
                      duration: 0.2,
                      ease: "easeOut"                // Natural deceleration
                    }}
                    className={activePage === 'Messages' ? 'w-full h-full' : 'w-full h-full'}
                  >
                    {renderContent()}
                  </motion.div>
                </AnimatePresence>
                {/* 🚀 ANIMATED PAGE TRANSITION END */}

              </div>
            </main>


          </div>

          {/* Chat overlay */}
          <AnimatePresence>
            {activeUserId && <ChatPage />}
          </AnimatePresence>

          {/* Study Session Modal (Global) */}
          <StudySessionModal />

          {/* Personal Call Modal (Global) */}

          {/* 🚀 Mini-App Windows */}
          {dockApps.map(app => (
            <Window
              key={app.id}
              app={app}
              isOpen={openWindows.includes(app.id)}
              isMinimized={minimizedWindows.includes(app.id)}
              isActive={activeWindow === app.id}
              zIndex={windowZIndices[app.id] || baseZIndex}
              iconRect={iconPositions[app.id]}
              mode={windowModes[app.id] || 'normal'}
              position={windowPositions[app.id]}
              onClose={() => handleWindowClose(app.id)}
              onMinimize={() => handleWindowMinimize(app.id)}
              onMaximize={() => handleWindowMaximize(app.id)}
              onSnap={(mode) => handleWindowSnap(app.id, mode)}
              onMove={(x, y) => handleWindowMove(app.id, x, y)}
              onFocus={() => handleWindowFocus(app.id)}
            />
          ))}

          {/* Utility Launcher */}
          <AnimatePresence>
            {!superFocus.isActive && showCalculatorLauncher && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 16 }}
                transition={{ duration: 0.2 }}
                className="fixed right-6 bottom-8 z-50 flex flex-col gap-3 rounded-3xl border border-white/15 bg-white/10 p-3 text-white shadow-xl backdrop-blur-xl"
              >
                {[
                  { id: 'calculator', label: 'Calculator', hint: 'Math + convert + graph', icon: <Calculator size={20} /> },
                  { id: 'whiteboard', label: 'Whiteboard', hint: 'Freeform sketch space', icon: <PenTool size={20} /> },
                ].map((utility) => (
                  <button
                    key={utility.id}
                    onClick={() => handleAppClick(utility.id)}
                    className="flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-white transition hover:bg-white/15"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                      {utility.icon}
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-white/45">Utility</div>
                      <div className="text-sm font-medium text-white/90">{utility.label}</div>
                      <div className="text-xs text-white/45">{utility.hint}</div>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      )}
    </div>
  );
};

export default App;
