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
    targetSize?: number;
    customSettings?: Partial<CompressionPreset>;
}
export interface JobProgress {
    jobId: string;
    fileId: string;
    status: 'waiting' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
    progress: number;
    speed?: string;
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
    outputNamingPattern: string;
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
    duration: number;
    status: 'success' | 'failed';
    error?: string;
}
export type IpcChannels = {
    'media/probe': {
        request: {
            filePath: string;
        };
        response: MediaInfo | {
            error: string;
        };
    };
    'job/start': {
        request: StartJobRequest;
        response: StartJobResponse | {
            error: string;
        };
    };
    'job/cancel': {
        request: {
            jobId: string;
        };
        response: {
            success: boolean;
        };
    };
    'job/pause': {
        request: {
            jobId: string;
        };
        response: {
            success: boolean;
        };
    };
    'job/resume': {
        request: {
            jobId: string;
        };
        response: {
            success: boolean;
        };
    };
    'job/clear-completed': {
        request: {};
        response: {
            success: boolean;
        };
    };
    'settings/get': {
        request: {};
        response: AppSettings;
    };
    'settings/set': {
        request: Partial<AppSettings>;
        response: {
            success: boolean;
        };
    };
    'settings/reset': {
        request: {};
        response: {
            success: boolean;
        };
    };
    'history/get': {
        request: {
            limit?: number;
        };
        response: HistoryItem[];
    };
    'history/clear': {
        request: {};
        response: {
            success: boolean;
        };
    };
    'app/show-item-in-folder': {
        request: {
            path: string;
        };
        response: {
            success: boolean;
        };
    };
    'app/get-version': {
        request: {};
        response: {
            version: string;
        };
    };
};
export type EventChannels = {
    'job/progress': JobProgress;
    'job/completed': {
        jobId: string;
        success: boolean;
        error?: string;
    };
    'app/log': {
        level: 'info' | 'warn' | 'error';
        message: string;
        timestamp: number;
    };
};
export type Unsubscribe = () => void;
export interface VideoCompressorAPI {
    probeMedia(filePath: string): Promise<MediaInfo>;
    startJob(config: JobConfig): Promise<string>;
    cancelJob(jobId: string): Promise<boolean>;
    pauseJob(jobId: string): Promise<boolean>;
    resumeJob(jobId: string): Promise<boolean>;
    clearCompletedJobs(): Promise<boolean>;
    getSettings(): Promise<AppSettings>;
    updateSettings(settings: Partial<AppSettings>): Promise<boolean>;
    resetSettings(): Promise<boolean>;
    getHistory(limit?: number): Promise<HistoryItem[]>;
    clearHistory(): Promise<boolean>;
    showItemInFolder(path: string): Promise<boolean>;
    getAppVersion(): Promise<string>;
    onJobProgress(callback: (progress: JobProgress) => void): Unsubscribe;
    onJobCompleted(callback: (result: {
        jobId: string;
        success: boolean;
        error?: string;
    }) => void): Unsubscribe;
    onLog(callback: (log: {
        level: 'info' | 'warn' | 'error';
        message: string;
        timestamp: number;
    }) => void): Unsubscribe;
}
export declare const DEFAULT_PRESETS: CompressionPreset[];
//# sourceMappingURL=types.d.ts.map