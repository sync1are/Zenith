console.log("Electron preload loaded");
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Window controls
  minimize: () => ipcRenderer.send("minimize-window"),
  maximize: () => ipcRenderer.send("maximize-window"),
  close: () => ipcRenderer.send("close-window"),

  // SUPER Focus Mode
  enterSuperFocus: () => ipcRenderer.send("enter-super-focus"),
  exitSuperFocus: () => ipcRenderer.send("exit-super-focus"),

  // Compact Mode
  setCompactMode: () => ipcRenderer.send("set-compact-mode"),
  setNormalMode: () => ipcRenderer.send("set-normal-mode"),
  resizeCompactWindow: (height) => ipcRenderer.send("resize-compact-window", height),
  onCompactModeExited: (callback) => {
    ipcRenderer.on('compact-mode-exited', callback);
  },
  removeCompactModeListener: () => {
    ipcRenderer.removeAllListeners('compact-mode-exited');
  },

  // Listen for ESC key press from main process
  onExitSuperFocusRequested: (callback) => {
    ipcRenderer.on('exit-super-focus-requested', callback);
  },
  removeExitSuperFocusListener: () => {
    ipcRenderer.removeAllListeners('exit-super-focus-requested');
  },

  // Open URL in external browser
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // OAuth Callback Server
  startOAuthServer: () => ipcRenderer.invoke('start-oauth-server'),
  onSpotifyCallback: (callback) => {
    ipcRenderer.on('spotify-oauth-callback', (event, data) => callback(data));
  },
  removeSpotifyCallbackListener: () => {
    ipcRenderer.removeAllListeners('spotify-oauth-callback');
  },

  // Deep Link Handler (for custom protocol)
  onSpotifyDeepLink: (callback) => {
    ipcRenderer.on('spotify-deep-link', (event, data) => callback(data));
  },
  removeSpotifyDeepLinkListener: () => {
    ipcRenderer.removeAllListeners('spotify-deep-link');
  },

  // Secure Spotify
  spotify: {
    encryptToken: (token) => ipcRenderer.invoke('spotify-encrypt-token', token),
    refreshToken: (encryptedToken) => ipcRenderer.invoke('spotify-refresh-token', encryptedToken),
  },

  // Discord Rich Presence
  updateDiscordPresence: (data) => ipcRenderer.send('update-discord-presence', data),

  // Auto-Update
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  downloadUpdate: () => ipcRenderer.send('download-update'),
  installUpdate: () => ipcRenderer.send('install-update'),
  onUpdateChecking: (callback) => ipcRenderer.on('update-checking', callback),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (event, data) => callback(data)),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', callback),
  onUpdateDownloadProgress: (callback) => ipcRenderer.on('update-download-progress', (event, data) => callback(data)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (event, data) => callback(data)),
  onUpdateError: (callback) => ipcRenderer.on('update-error', (event, data) => callback(data)),
  removeUpdateListeners: () => {
    ipcRenderer.removeAllListeners('update-checking');
    ipcRenderer.removeAllListeners('update-available');
    ipcRenderer.removeAllListeners('update-not-available');
    ipcRenderer.removeAllListeners('update-download-progress');
    ipcRenderer.removeAllListeners('update-downloaded');
    ipcRenderer.removeAllListeners('update-error');
  },

  // Unified AI bridge
  ai: {
    chat: (payload) => ipcRenderer.invoke('ai-chat', payload),
  },

  // Local Whisper Speech-to-Text
  whisper: {
    transcribe: (audioBlob, options) => ipcRenderer.invoke('whisper-transcribe', audioBlob, options),
    checkHealth: () => ipcRenderer.invoke('whisper-health'),
    startService: () => ipcRenderer.invoke('whisper-start'),
    stopService: () => ipcRenderer.invoke('whisper-stop'),
  },
});
