/// <reference types="vite/client" />

interface Window {
  videoCompressor: {
    probeMedia(filePath: string): Promise<any>;
    startJob(config: any): Promise<string>;
    cancelJob(jobId: string): Promise<boolean>;
    pauseJob(jobId: string): Promise<boolean>;
    resumeJob(jobId: string): Promise<boolean>;
    clearCompletedJobs(): Promise<boolean>;
    getSettings(): Promise<any>;
    updateSettings(settings: any): Promise<boolean>;
    resetSettings(): Promise<boolean>;
    getHistory(limit?: number): Promise<any[]>;
    clearHistory(): Promise<boolean>;
    showItemInFolder(path: string): Promise<boolean>;
    getAppVersion(): Promise<string>;
    onJobProgress(callback: (progress: any) => void): () => void;
    onJobCompleted(callback: (result: any) => void): () => void;
    onLog(callback: (log: any) => void): () => void;
  };
  electronAPI: {
    platform: string;
    versions: any;
  };
}