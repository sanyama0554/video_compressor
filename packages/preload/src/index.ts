import { contextBridge, ipcRenderer } from 'electron';
import type { 
  VideoCompressorAPI, 
  MediaInfo, 
  JobConfig, 
  AppSettings, 
  HistoryItem,
  JobProgress,
  Unsubscribe 
} from './types';

// Create the API implementation
const api: VideoCompressorAPI = {
  // Media operations
  async probeMedia(filePath: string): Promise<MediaInfo> {
    const result = await ipcRenderer.invoke('media/probe', { filePath });
    if ('error' in result) {
      throw new Error(result.error);
    }
    return result;
  },

  // Job management
  async startJob(config: JobConfig): Promise<string> {
    const result = await ipcRenderer.invoke('job/start', { config });
    if ('error' in result) {
      throw new Error(result.error);
    }
    return result.jobId;
  },

  async cancelJob(jobId: string): Promise<boolean> {
    const result = await ipcRenderer.invoke('job/cancel', { jobId });
    return result.success;
  },

  async pauseJob(jobId: string): Promise<boolean> {
    const result = await ipcRenderer.invoke('job/pause', { jobId });
    return result.success;
  },

  async resumeJob(jobId: string): Promise<boolean> {
    const result = await ipcRenderer.invoke('job/resume', { jobId });
    return result.success;
  },

  async clearCompletedJobs(): Promise<boolean> {
    const result = await ipcRenderer.invoke('job/clear-completed', {});
    return result.success;
  },

  // Settings
  async getSettings(): Promise<AppSettings> {
    return await ipcRenderer.invoke('settings/get', {});
  },

  async updateSettings(settings: Partial<AppSettings>): Promise<boolean> {
    const result = await ipcRenderer.invoke('settings/set', settings);
    return result.success;
  },

  async resetSettings(): Promise<boolean> {
    const result = await ipcRenderer.invoke('settings/reset', {});
    return result.success;
  },

  // History
  async getHistory(limit?: number): Promise<HistoryItem[]> {
    return await ipcRenderer.invoke('history/get', { limit });
  },

  async clearHistory(): Promise<boolean> {
    const result = await ipcRenderer.invoke('history/clear', {});
    return result.success;
  },

  // System operations
  async showItemInFolder(path: string): Promise<boolean> {
    const result = await ipcRenderer.invoke('app/show-item-in-folder', { path });
    return result.success;
  },

  async getAppVersion(): Promise<string> {
    const result = await ipcRenderer.invoke('app/get-version', {});
    return result.version;
  },

  // Event listeners
  onJobProgress(callback: (progress: JobProgress) => void): Unsubscribe {
    const listener = (_event: any, progress: JobProgress) => callback(progress);
    ipcRenderer.on('job/progress', listener);
    return () => ipcRenderer.removeListener('job/progress', listener);
  },

  onJobCompleted(callback: (result: { jobId: string; success: boolean; error?: string }) => void): Unsubscribe {
    const listener = (_event: any, result: { jobId: string; success: boolean; error?: string }) => callback(result);
    ipcRenderer.on('job/completed', listener);
    return () => ipcRenderer.removeListener('job/completed', listener);
  },

  onLog(callback: (log: { level: 'info' | 'warn' | 'error'; message: string; timestamp: number }) => void): Unsubscribe {
    const listener = (_event: any, log: { level: 'info' | 'warn' | 'error'; message: string; timestamp: number }) => callback(log);
    ipcRenderer.on('app/log', listener);
    return () => ipcRenderer.removeListener('app/log', listener);
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('videoCompressor', api);

// Also expose some useful Node.js APIs
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: process.versions,
});

// Type declarations for the global window object
declare global {
  interface Window {
    videoCompressor: VideoCompressorAPI;
    electronAPI: {
      platform: NodeJS.Platform;
      versions: NodeJS.ProcessVersions;
    };
  }
}