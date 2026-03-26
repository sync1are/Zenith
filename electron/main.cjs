// electron/main.cjs
const { app, BrowserWindow, globalShortcut, ipcMain } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const http = require("http");
const { initDiscordRPC, setActivity, destroyRPC } = require("./discordRPC.cjs");

const isDev = !app.isPackaged;
let mainWindow = null;
let isSuperFocusMode = false;
const OLLAMA_CLOUD_URL = "https://ollama.com/api/chat";
const OLLAMA_CLOUD_MODEL = "qwen3-vl:235b-instruct-cloud";
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || process.env.OLLAMA_CLOUD_API_KEY || "07f74098d2314c138c57ece42116a025.PP-gkCoZVTA8lWLdEIVCovUS";

// Auto-updater configuration
autoUpdater.autoDownload = false; // Don't auto-download, let user decide
autoUpdater.autoInstallOnAppQuit = true; // Install when app quits

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for updates...');
  if (mainWindow) {
    mainWindow.webContents.send('update-checking');
  }
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info.version);
  if (mainWindow) {
    mainWindow.webContents.send('update-available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes
    });
  }
});

autoUpdater.on('update-not-available', () => {
  console.log('No updates available');
  if (mainWindow) {
    mainWindow.webContents.send('update-not-available');
  }
});

autoUpdater.on('download-progress', (progressInfo) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-download-progress', {
      percent: progressInfo.percent,
      transferred: progressInfo.transferred,
      total: progressInfo.total
    });
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info.version);
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded', {
      version: info.version
    });
  }
});

autoUpdater.on('error', (err) => {
  console.error('Update error:', err);
  if (mainWindow) {
    mainWindow.webContents.send('update-error', {
      message: err.message
    });
  }
});

// IPC handlers for updates
ipcMain.on('check-for-updates', () => {
  if (!isDev) {
    autoUpdater.checkForUpdates();
  }
});

ipcMain.on('download-update', () => {
  autoUpdater.downloadUpdate();
});

ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall(false, true);
});

async function callOllamaCloud({ messages, format, maxTokens = 2000, temperature = 0.3 }) {
  if (!OLLAMA_API_KEY) {
    throw new Error("OLLAMA_API_KEY is not configured.");
  }

  const response = await fetch(OLLAMA_CLOUD_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OLLAMA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OLLAMA_CLOUD_MODEL,
      messages,
      format,
      stream: false,
      options: {
        temperature,
        num_predict: maxTokens,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama Cloud request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return {
    model: data.model || OLLAMA_CLOUD_MODEL,
    content: data.message?.content || "",
  };
}

ipcMain.handle('ai-chat', async (event, payload) => {
  void event;
  return await callOllamaCloud(payload);
});

function createWindow() {
  const win = new BrowserWindow({
    backgroundColor: "#111217",
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: "hidden",

    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true, // Enable <webview> tag for mini-apps
    },
  });

  mainWindow = win;

  if (isDev) {
    // Load Vite dev server
    win.loadURL("http://localhost:5173");
  } else {
    // Load built production files
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();

  // Initialize Discord Rich Presence
  initDiscordRPC();

  // Check for updates after 10 seconds (avoid blocking startup)
  if (!isDev) {
    setTimeout(() => {
      autoUpdater.checkForUpdates();
    }, 10000);
  }

  // Pre-start Whisper service in the background (3 second delay to not block UI)
  setTimeout(async () => {
    console.log('Pre-starting Whisper service...');
    const result = await startWhisperService();
    if (result.success) {
      console.log('✓ Whisper service pre-started successfully');
    } else {
      console.warn('⚠ Whisper service pre-start failed:', result.error);
      // Not critical - will retry when user actually tries to transcribe
    }
  }, 3000);
});

// Discord Rich Presence update handler
ipcMain.on('update-discord-presence', (event, data) => {
  setActivity(data);
});

ipcMain.on("minimize-window", () => {
  BrowserWindow.getFocusedWindow()?.minimize();
});

ipcMain.on("maximize-window", () => {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return;
  win.isMaximized() ? win.unmaximize() : win.maximize();
});

ipcMain.on("close-window", () => {
  BrowserWindow.getFocusedWindow()?.close();
});

// SUPER Focus Mode handlers
ipcMain.on("enter-super-focus", () => {
  if (!mainWindow) return;

  isSuperFocusMode = true;

  // Enable kiosk mode for true fullscreen lockdown on Windows
  mainWindow.setKiosk(true);
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true);
  mainWindow.focus();

  // Only block window close shortcuts - allow everything else
  globalShortcut.register('Alt+F4', () => { });
  globalShortcut.register('CommandOrControl+W', () => { });

  // ESC key to exit
  globalShortcut.register('Escape', () => {
    if (mainWindow) {
      mainWindow.webContents.send('exit-super-focus-requested');
    }
  });
});

ipcMain.on("exit-super-focus", () => {
  if (!mainWindow) return;

  isSuperFocusMode = false;

  // Disable kiosk mode
  mainWindow.setKiosk(false);
  mainWindow.setAlwaysOnTop(false);
  mainWindow.setVisibleOnAllWorkspaces(false);

  globalShortcut.unregisterAll();
});

// Open URL in external browser
const { shell } = require("electron");
ipcMain.handle('open-external', async (event, url) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    console.error('Failed to open external URL:', error);
    return { success: false, error: error.message };
  }
});

// OAuth Callback Server for Spotify
let oauthServer = null;

ipcMain.handle('start-oauth-server', async () => {
  return new Promise((resolve, reject) => {
    // Close existing server if any
    if (oauthServer) {
      oauthServer.close();
      oauthServer = null;
    }

    oauthServer = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:8888`);

      if (url.pathname === '/callback') {
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        const error = url.searchParams.get('error');

        // Send success response to browser
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body style="background: #1a1a2e; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
              <div style="text-align: center;">
                <h1>✓ Authorization Complete</h1>
                <p>You can close this window and return to Lumen.</p>
              </div>
            </body>
          </html>
        `);

        // Send the auth data to renderer
        if (mainWindow) {
          mainWindow.webContents.send('spotify-oauth-callback', { code, state, error });
        }

        // Close server after handling callback
        setTimeout(() => {
          if (oauthServer) {
            oauthServer.close();
            oauthServer = null;
          }
        }, 1000);
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    oauthServer.listen(8888, 'localhost', () => {
      console.log('OAuth callback server listening on http://localhost:8888');
      resolve({ success: true, port: 8888 });
    });

    oauthServer.on('error', (error) => {
      console.error('OAuth server error:', error);
      reject(error);
    });
  });
});

// Secure Spotify Token Handlers
const { safeStorage, net } = require("electron");

ipcMain.handle('spotify-encrypt-token', async (event, token) => {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(token).toString('base64');
  }
  console.warn("safeStorage not available, storing plain token");
  return token;
});

ipcMain.handle('spotify-refresh-token', async (event, encryptedToken) => {
  try {
    let refreshToken = encryptedToken;
    if (safeStorage.isEncryptionAvailable()) {
      try {
        refreshToken = safeStorage.decryptString(Buffer.from(encryptedToken, 'base64'));
      } catch (e) {
        console.error("Failed to decrypt token:", e);
        throw new Error("Decryption failed");
      }
    }

    const SPOTIFY_CLIENT_ID = "c78fa3fb2fc34a76ae9f6771a403589f";

    const body = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString();

    const request = net.request({
      method: 'POST',
      url: 'https://accounts.spotify.com/api/token',
    });

    request.setHeader('Content-Type', 'application/x-www-form-urlencoded');

    return new Promise((resolve, reject) => {
      request.on('response', (response) => {
        let data = '';
        response.on('data', (chunk) => {
          data += chunk;
        });
        response.on('end', () => {
          if (response.statusCode === 200) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`Spotify refresh failed: ${response.statusCode} ${data}`));
          }
        });
      });
      request.on('error', (error) => {
        reject(error);
      });
      request.write(body);
      request.end();
    });

  } catch (error) {
    console.error("Spotify refresh error:", error);
    throw error;
  }
});

// Compact Mode handlers
let normalBounds = null;

ipcMain.on('set-compact-mode', () => {
  if (!mainWindow) return;

  normalBounds = mainWindow.getBounds();
  mainWindow.setSize(300, 130);
  mainWindow.setAlwaysOnTop(true, 'floating');
  mainWindow.setResizable(false);
  mainWindow.setBackgroundColor('#00000000');

  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  mainWindow.setPosition(width - 320, height - 150);
});

ipcMain.on('resize-compact-window', (event, newHeight) => {
  if (!mainWindow) return;
  const targetHeight = Math.min(Math.max(newHeight, 130), 600);
  const bounds = mainWindow.getBounds();

  // Expand downwards by keeping Y position fixed
  mainWindow.setBounds({
    x: bounds.x,
    y: bounds.y, // Keep top position fixed
    width: 300,
    height: targetHeight
  });
});

ipcMain.on('set-normal-mode', () => {
  if (!mainWindow) return;

  mainWindow.setAlwaysOnTop(false);
  mainWindow.setResizable(true);
  mainWindow.setBackgroundColor('#111217');

  if (normalBounds) {
    mainWindow.setBounds(normalBounds);
  } else {
    mainWindow.maximize();
  }

  mainWindow.webContents.send('compact-mode-exited');
});

// ==================== LOCAL WHISPER SERVICE ====================
const { spawn } = require('child_process');
let whisperProcess = null;
const WHISPER_PORT = 5678;
const WHISPER_URL = `http://127.0.0.1:${WHISPER_PORT}`;

async function startWhisperService() {
  if (whisperProcess) {
    // Verify the existing process is still responsive
    const health = await checkWhisperHealth();
    if (health.status === 'ok') {
      console.log('Whisper service already running and healthy');
      return { success: true, message: 'Already running' };
    }
    // Process exists but not responding, kill and restart
    console.log('Whisper process exists but not responding, restarting...');
    whisperProcess.kill();
    whisperProcess = null;
  }

  const servicePath = path.join(__dirname, '..', 'services', 'whisper_service.py');

  return new Promise((resolve) => {
    console.log('Starting Whisper service from:', servicePath);

    // Try python first on Windows, python3 on Unix
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

    try {
      whisperProcess = spawn(pythonCmd, [servicePath], {
        cwd: path.join(__dirname, '..', 'services'),
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false
      });
    } catch (spawnErr) {
      console.error('Failed to spawn Whisper process:', spawnErr);
      resolve({ success: false, error: `Failed to spawn: ${spawnErr.message}` });
      return;
    }

    let hasResolved = false;
    let startupOutput = '';
    let startupError = '';

    whisperProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('[Whisper]', output);
      startupOutput += output;
    });

    whisperProcess.stderr.on('data', (data) => {
      const errOutput = data.toString();
      console.error('[Whisper Error]', errOutput);
      startupError += errOutput;
    });

    whisperProcess.on('error', (err) => {
      console.error('Whisper process error:', err);
      whisperProcess = null;
      if (!hasResolved) {
        hasResolved = true;
        resolve({ success: false, error: `Process error: ${err.message}` });
      }
    });

    whisperProcess.on('close', (code) => {
      console.log(`Whisper service exited with code ${code}`);
      const wasRunning = whisperProcess !== null;
      whisperProcess = null;

      // Only resolve with error if we haven't resolved yet and process died early
      if (!hasResolved && code !== 0) {
        hasResolved = true;
        resolve({ success: false, error: `Process exited with code ${code}. Error: ${startupError || 'Unknown error'}` });
      }
    });

    // Poll health endpoint instead of parsing stdout (more reliable)
    const pollInterval = 1000;
    const maxAttempts = 90; // 90 seconds max wait
    let attempts = 0;

    const pollHealth = async () => {
      if (hasResolved) return;

      attempts++;
      try {
        const health = await checkWhisperHealth();
        if (health.status === 'ok' && health.ready) {
          if (!hasResolved) {
            hasResolved = true;
            console.log('Whisper service is ready!');
            resolve({ success: true, message: 'Whisper service started' });
          }
          return;
        }
      } catch (e) {
        // Service not ready yet, continue polling
      }

      if (attempts >= maxAttempts) {
        if (!hasResolved) {
          hasResolved = true;
          resolve({ success: false, error: `Timeout after ${maxAttempts} seconds. Output: ${startupOutput.slice(-500)}` });
        }
      } else if (whisperProcess) {
        // Only continue polling if process is still alive
        setTimeout(pollHealth, pollInterval);
      }
    };

    // Start polling after a short delay to give process time to start
    setTimeout(pollHealth, 2000);
  });
}

function stopWhisperService() {
  if (whisperProcess) {
    whisperProcess.kill();
    whisperProcess = null;
    return { success: true, message: 'Whisper service stopped' };
  }
  return { success: true, message: 'Whisper service was not running' };
}

async function checkWhisperHealth() {
  try {
    const response = await fetch(`${WHISPER_URL}/health`);
    if (response.ok) {
      return await response.json();
    }
    return { status: 'error', message: 'Service not responding' };
  } catch (error) {
    return { status: 'offline', message: error.message };
  }
}

async function transcribeWithWhisper(audioBuffer, options = {}) {
  void options;
  try {
    const headers = {
      'Content-Type': 'application/octet-stream'
    };

    const response = await fetch(`${WHISPER_URL}/transcribe`, {
      method: 'POST',
      headers,
      body: Buffer.from(audioBuffer)
    });

    if (response.ok) {
      return await response.json();
    }
    const errorText = await response.text();
    return { error: `Transcription failed: ${errorText}` };
  } catch (error) {
    return { error: error.message };
  }
}

// Whisper IPC Handlers
ipcMain.handle('whisper-start', async () => {
  return await startWhisperService();
});

ipcMain.handle('whisper-stop', async () => {
  return stopWhisperService();
});

ipcMain.handle('whisper-health', async () => {
  return await checkWhisperHealth();
});

ipcMain.handle('whisper-transcribe', async (event, audioBuffer, options = {}) => {
  // First check if service is running
  const health = await checkWhisperHealth();
  if (health.status !== 'ok') {
    console.log('Whisper service not healthy, attempting to start...', health);
    // Try to start service
    const startResult = await startWhisperService();
    if (!startResult.success) {
      console.error('Failed to start Whisper service:', startResult);
      return { error: `Failed to start Whisper service: ${startResult.error || 'Unknown error'}` };
    }
    // The polling in startWhisperService already waits for readiness
    // Add a brief extra delay just in case
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return await transcribeWithWhisper(audioBuffer, options);
});

app.on("window-all-closed", () => {
  // Stop Whisper service when app closes
  stopWhisperService();
  if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  stopWhisperService();
  // Cleanup Discord RPC
  destroyRPC();
});
