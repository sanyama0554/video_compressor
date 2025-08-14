import { ipcMain, BrowserWindow, shell, app } from 'electron';
import type { MediaManager } from '../media/MediaManager';
import type { JobManager } from '../jobs/JobManager';
import type { SettingsManager } from '../settings/SettingsManager';
import type { HistoryManager } from '../history/HistoryManager';
import type { IpcChannels } from '../types';

interface Managers {
  mediaManager: MediaManager;
  jobManager: JobManager;
  settingsManager: SettingsManager;
  historyManager: HistoryManager;
  mainWindow: BrowserWindow | null;
}

export function setupIpcHandlers(managers: Managers): void {
  const { mediaManager, jobManager, settingsManager, historyManager, mainWindow } = managers;

  // Media operations
  ipcMain.handle('media/probe', async (_, args: IpcChannels['media/probe']['request']) => {
    try {
      const mediaInfo = await mediaManager.probeFile(args.filePath);
      return mediaInfo;
    } catch (error) {
      return { error: (error as Error).message };
    }
  });

  // Job management
  ipcMain.handle('job/start', async (_, args: IpcChannels['job/start']['request']) => {
    try {
      const jobId = await jobManager.startJob(args.config);
      return { jobId };
    } catch (error) {
      return { error: (error as Error).message };
    }
  });

  ipcMain.handle('job/cancel', async (_, args: IpcChannels['job/cancel']['request']) => {
    try {
      await jobManager.cancelJob(args.jobId);
      return { success: true };
    } catch (error) {
      console.error('Failed to cancel job:', error);
      return { success: false };
    }
  });

  ipcMain.handle('job/pause', async (_, args: IpcChannels['job/pause']['request']) => {
    try {
      await jobManager.pauseJob(args.jobId);
      return { success: true };
    } catch (error) {
      console.error('Failed to pause job:', error);
      return { success: false };
    }
  });

  ipcMain.handle('job/resume', async (_, args: IpcChannels['job/resume']['request']) => {
    try {
      await jobManager.resumeJob(args.jobId);
      return { success: true };
    } catch (error) {
      console.error('Failed to resume job:', error);
      return { success: false };
    }
  });

  ipcMain.handle('job/clear-completed', async () => {
    try {
      jobManager.clearCompletedJobs();
      return { success: true };
    } catch (error) {
      console.error('Failed to clear completed jobs:', error);
      return { success: false };
    }
  });

  // Settings management
  ipcMain.handle('settings/get', async () => {
    return settingsManager.getSettings();
  });

  ipcMain.handle('settings/set', async (_, settings: IpcChannels['settings/set']['request']) => {
    try {
      settingsManager.updateSettings(settings);
      return { success: true };
    } catch (error) {
      console.error('Failed to update settings:', error);
      return { success: false };
    }
  });

  ipcMain.handle('settings/reset', async () => {
    try {
      settingsManager.resetSettings();
      return { success: true };
    } catch (error) {
      console.error('Failed to reset settings:', error);
      return { success: false };
    }
  });

  // History management
  ipcMain.handle('history/get', async (_, args: IpcChannels['history/get']['request']) => {
    return historyManager.getHistory(args.limit);
  });

  ipcMain.handle('history/clear', async () => {
    try {
      historyManager.clearHistory();
      return { success: true };
    } catch (error) {
      console.error('Failed to clear history:', error);
      return { success: false };
    }
  });

  // Application operations
  ipcMain.handle('app/show-item-in-folder', async (_, args: IpcChannels['app/show-item-in-folder']['request']) => {
    try {
      shell.showItemInFolder(args.path);
      return { success: true };
    } catch (error) {
      console.error('Failed to show item in folder:', error);
      return { success: false };
    }
  });

  ipcMain.handle('app/get-version', async () => {
    return { version: app.getVersion() };
  });

  // Set up job progress events
  jobManager.on('progress', (progress) => {
    mainWindow?.webContents.send('job/progress', progress);
  });

  jobManager.on('completed', (result) => {
    mainWindow?.webContents.send('job/completed', result);
  });

  jobManager.on('log', (log) => {
    mainWindow?.webContents.send('app/log', log);
  });
}