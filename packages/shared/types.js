"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PRESETS = void 0;
// Default presets
exports.DEFAULT_PRESETS = [
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
//# sourceMappingURL=types.js.map