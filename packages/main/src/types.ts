export interface MediaInfo {
  format: {
    filename: string;
    nb_streams: number;
    nb_programs: number;
    format_name: string;
    format_long_name: string;
    start_time: string;
    duration: string;
    size: string;
    bit_rate: string;
    probe_score: number;
    tags?: Record<string, string>;
  };
  streams: MediaStream[];
}

export interface MediaStream {
  index: number;
  codec_name: string;
  codec_long_name: string;
  profile?: string;
  codec_type: 'video' | 'audio' | 'subtitle' | 'data';
  codec_tag_string: string;
  codec_tag: string;
  width?: number;
  height?: number;
  coded_width?: number;
  coded_height?: number;
  closed_captions?: number;
  film_grain?: number;
  has_b_frames?: number;
  sample_aspect_ratio?: string;
  display_aspect_ratio?: string;
  pix_fmt?: string;
  level?: number;
  color_range?: string;
  color_space?: string;
  color_transfer?: string;
  color_primaries?: string;
  chroma_location?: string;
  field_order?: string;
  refs?: number;
  r_frame_rate: string;
  avg_frame_rate: string;
  time_base: string;
  start_pts: number;
  start_time: string;
  duration_ts?: number;
  duration?: string;
  bit_rate?: string;
  max_bit_rate?: string;
  bits_per_raw_sample?: string;
  nb_frames?: string;
  nb_read_frames?: string;
  nb_read_packets?: string;
  sample_rate?: string;
  channels?: number;
  channel_layout?: string;
  bits_per_sample?: number;
  initial_padding?: number;
  tags?: Record<string, string>;
  disposition: Record<string, number>;
}

export interface CompressionPreset {
  id: string;
  name: string;
  video?: {
    codec: 'libx264' | 'libx265' | 'libvpx-vp9';
    crf?: number;
    bitrate?: string;
    preset: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow';
    profile?: 'baseline' | 'main' | 'high';
    level?: string;
    pixelFormat: string;
    maxWidth?: number;
    maxHeight?: number;
    fps?: number;
    twoPass: boolean;
  };
  audio?: {
    codec: 'aac' | 'mp3' | 'libopus';
    bitrate: string;
    sampleRate?: number;
    channels?: number;
  };
  removeVideo?: boolean;
  removeAudio?: boolean;
}

export interface JobConfig {
  inputPath: string;
  outputPath: string;
  preset: CompressionPreset;
  targetSize?: number; // bytes
  customSettings?: Partial<CompressionPreset>;
}

export interface JobProgress {
  jobId: string;
  fileId: string;
  status: 'waiting' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  progress: number; // 0-100
  speed?: string; // e.g., "1.2x"
  fps?: string;
  bitrate?: string;
  size?: string;
  time?: string;
  eta?: string;
  error?: string;
}

export interface StartJobRequest {
  config: JobConfig;
}

export interface StartJobResponse {
  jobId: string;
}

export interface FileItem {
  id: string;
  path: string;
  name: string;
  size: number;
  mediaInfo?: MediaInfo;
  estimatedOutputSize?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  outputPath?: string;
}

export interface AppSettings {
  defaultPreset: string;
  maxParallelJobs: number;
  outputNamingPattern: string; // e.g., "{name}_compressed.{ext}"
  defaultOutputDir: string;
  ffmpegPath?: string;
  ffprobePath?: string;
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'ja';
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  inputPath: string;
  outputPath: string;
  preset: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  duration: number; // milliseconds
  status: 'success' | 'failed';
  error?: string;
}

export type IpcChannels = {
  'media/probe': {
    request: { filePath: string };
    response: MediaInfo | { error: string };
  };
  'job/start': {
    request: StartJobRequest;
    response: StartJobResponse | { error: string };
  };
  'job/cancel': {
    request: { jobId: string };
    response: { success: boolean };
  };
  'job/pause': {
    request: { jobId: string };
    response: { success: boolean };
  };
  'job/resume': {
    request: { jobId: string };
    response: { success: boolean };
  };
  'job/clear-completed': {
    request: {};
    response: { success: boolean };
  };
  'settings/get': {
    request: {};
    response: AppSettings;
  };
  'settings/set': {
    request: Partial<AppSettings>;
    response: { success: boolean };
  };
  'settings/reset': {
    request: {};
    response: { success: boolean };
  };
  'history/get': {
    request: { limit?: number };
    response: HistoryItem[];
  };
  'history/clear': {
    request: {};
    response: { success: boolean };
  };
  'app/show-item-in-folder': {
    request: { path: string };
    response: { success: boolean };
  };
  'app/get-version': {
    request: {};
    response: { version: string };
  };
};

// Event channels (one-way from main to renderer)
export type EventChannels = {
  'job/progress': JobProgress;
  'job/completed': { jobId: string; success: boolean; error?: string };
  'app/log': { level: 'info' | 'warn' | 'error'; message: string; timestamp: number };
};

export type Unsubscribe = () => void;

// API interface exposed to renderer through contextBridge
export interface VideoCompressorAPI {
  // Media operations
  probeMedia(filePath: string): Promise<MediaInfo>;
  
  // Job management
  startJob(config: JobConfig): Promise<string>; // returns jobId
  cancelJob(jobId: string): Promise<boolean>;
  pauseJob(jobId: string): Promise<boolean>;
  resumeJob(jobId: string): Promise<boolean>;
  clearCompletedJobs(): Promise<boolean>;
  
  // Settings
  getSettings(): Promise<AppSettings>;
  updateSettings(settings: Partial<AppSettings>): Promise<boolean>;
  resetSettings(): Promise<boolean>;
  
  // History
  getHistory(limit?: number): Promise<HistoryItem[]>;
  clearHistory(): Promise<boolean>;
  
  // System operations
  showItemInFolder(path: string): Promise<boolean>;
  getAppVersion(): Promise<string>;
  
  // Event listeners
  onJobProgress(callback: (progress: JobProgress) => void): Unsubscribe;
  onJobCompleted(callback: (result: { jobId: string; success: boolean; error?: string }) => void): Unsubscribe;
  onLog(callback: (log: { level: 'info' | 'warn' | 'error'; message: string; timestamp: number }) => void): Unsubscribe;
}

// Default presets
export const DEFAULT_PRESETS: CompressionPreset[] = [
  {
    id: 'github-pr',
    name: 'GitHub PR (標準)',
    video: {
      codec: 'libx264',
      crf: 23,
      preset: 'veryfast',
      profile: 'high',
      pixelFormat: 'yuv420p',
      maxWidth: 1920,
      maxHeight: 1080,
      fps: 30,
      twoPass: false,
    },
    audio: {
      codec: 'aac',
      bitrate: '128k',
    },
  },
  {
    id: 'high-compression',
    name: '高圧縮',
    video: {
      codec: 'libx264',
      crf: 28,
      preset: 'veryfast',
      profile: 'high',
      pixelFormat: 'yuv420p',
      maxWidth: 1280,
      maxHeight: 720,
      fps: 30,
      twoPass: false,
    },
    audio: {
      codec: 'aac',
      bitrate: '96k',
    },
  },
  {
    id: 'quality-priority',
    name: '画質優先',
    video: {
      codec: 'libx264',
      crf: 20,
      preset: 'slow',
      profile: 'high',
      pixelFormat: 'yuv420p',
      twoPass: false,
    },
    audio: {
      codec: 'aac',
      bitrate: '192k',
    },
  },
  {
    id: 'audio-only',
    name: '音声のみ',
    audio: {
      codec: 'aac',
      bitrate: '128k',
    },
    removeVideo: true,
  },
  {
    id: 'target-size',
    name: '目標サイズ',
    video: {
      codec: 'libx264',
      preset: 'veryfast',
      profile: 'high',
      pixelFormat: 'yuv420p',
      twoPass: true,
    },
    audio: {
      codec: 'aac',
      bitrate: '128k',
    },
  },
];