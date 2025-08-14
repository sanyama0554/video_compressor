import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { isDev } from './utils';
import { MediaManager } from './media/MediaManager';
import { JobManager } from './jobs/JobManager';
import { SettingsManager } from './settings/SettingsManager';
import { HistoryManager } from './history/HistoryManager';
import { setupIpcHandlers } from './ipc/handlers';

// Enable live reload for Electron in development
if (isDev) {
  require('electron-reload')(__dirname, {
    electron: join(__dirname, '..', 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit',
  });
}

class VideoCompressorApp {
  private mainWindow: BrowserWindow | null = null;
  private mediaManager: MediaManager;
  private jobManager: JobManager;
  private settingsManager: SettingsManager;
  private historyManager: HistoryManager;

  constructor() {
    this.mediaManager = new MediaManager();
    this.settingsManager = new SettingsManager();
    this.historyManager = new HistoryManager();
    this.jobManager = new JobManager(this.settingsManager, this.historyManager);

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // App event handlers
    app.whenReady().then(() => {
      this.createMainWindow();
      this.setupIpcHandlers();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createMainWindow();
        }
      });
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('before-quit', () => {
      this.jobManager.cleanup();
    });

    // Security: Prevent new window creation
    app.on('web-contents-created', (_, contents) => {
      contents.setWindowOpenHandler(() => {
        return { action: 'deny' };
      });

      // Prevent navigation to external protocols
      contents.on('will-navigate', (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);
        if (parsedUrl.origin !== 'http://localhost:3000' && !navigationUrl.startsWith('file://')) {
          event.preventDefault();
        }
      });
    });
  }

  private createMainWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      show: false,
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        preload: join(__dirname, '../../preload/dist/index.js'),
        webSecurity: true,
        allowRunningInsecureContent: false,
        experimentalFeatures: false,
      },
    });

    // Load the renderer
    if (isDev) {
      this.mainWindow.loadURL('http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(join(__dirname, '../../renderer/dist/index.html'));
    }

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Handle file drops
    this.mainWindow.webContents.on('did-finish-load', () => {
      this.setupFileDragAndDrop();
    });
  }

  private setupFileDragAndDrop(): void {
    if (!this.mainWindow) return;

    this.mainWindow.webContents.on('dom-ready', () => {
      this.mainWindow?.webContents.executeJavaScript(`
        document.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.stopPropagation();
        });

        document.addEventListener('drop', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          const files = Array.from(e.dataTransfer.files).map(file => file.path);
          window.videoCompressor.handleFileDrop?.(files);
        });
      `);
    });
  }

  private setupIpcHandlers(): void {
    setupIpcHandlers({
      mediaManager: this.mediaManager,
      jobManager: this.jobManager,
      settingsManager: this.settingsManager,
      historyManager: this.historyManager,
      mainWindow: this.mainWindow,
    });
  }

  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }
}

// Create app instance
const videoCompressorApp = new VideoCompressorApp();

export { videoCompressorApp };