import { spawn } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';
import type { MediaInfo } from '../types';
import { getResourcePath, isDev } from '../utils';

export class MediaManager {
  private ffprobePath: string;

  constructor() {
    this.ffprobePath = this.getFfprobePath();
  }

  private getFfprobePath(): string {
    if (isDev) {
      // In development, use the installed package
      const ffprobe = require('@ffprobe-installer/ffprobe');
      return ffprobe.path;
    } else {
      // In production, use the bundled binary
      const platform = process.platform;
      let binaryName: string;
      
      switch (platform) {
        case 'win32':
          binaryName = 'ffprobe.exe';
          break;
        case 'darwin':
          binaryName = 'ffprobe';
          break;
        case 'linux':
          binaryName = 'ffprobe';
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }
      
      return getResourcePath(join('ffprobe-installer', 'ffprobe', binaryName));
    }
  }

  public async probeFile(filePath: string): Promise<MediaInfo> {
    return new Promise((resolve, reject) => {
      if (!existsSync(filePath)) {
        reject(new Error('File does not exist'));
        return;
      }

      if (!existsSync(this.ffprobePath)) {
        reject(new Error(`FFprobe binary not found at: ${this.ffprobePath}`));
        return;
      }

      const args = [
        '-v', 'error',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath
      ];

      const ffprobe = spawn(this.ffprobePath, args);
      let stdout = '';
      let stderr = '';

      ffprobe.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      ffprobe.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`FFprobe failed with code ${code}: ${stderr}`));
          return;
        }

        try {
          const mediaInfo: MediaInfo = JSON.parse(stdout);
          
          // Validate the required structure
          if (!mediaInfo.format || !mediaInfo.streams) {
            reject(new Error('Invalid media file format'));
            return;
          }

          resolve(mediaInfo);
        } catch (error) {
          reject(new Error(`Failed to parse FFprobe output: ${(error as Error).message}`));
        }
      });

      ffprobe.on('error', (error) => {
        reject(new Error(`Failed to run FFprobe: ${error.message}`));
      });
    });
  }

  public async validateFile(filePath: string): Promise<{ isValid: boolean; type: 'video' | 'audio' | 'unknown'; error?: string }> {
    try {
      const mediaInfo = await this.probeFile(filePath);
      
      const hasVideo = mediaInfo.streams.some(stream => stream.codec_type === 'video');
      const hasAudio = mediaInfo.streams.some(stream => stream.codec_type === 'audio');
      
      if (hasVideo) {
        return { isValid: true, type: 'video' };
      } else if (hasAudio) {
        return { isValid: true, type: 'audio' };
      } else {
        return { isValid: false, type: 'unknown', error: 'No video or audio streams found' };
      }
    } catch (error) {
      return { isValid: false, type: 'unknown', error: (error as Error).message };
    }
  }

  public getVideoInfo(mediaInfo: MediaInfo): {
    width?: number;
    height?: number;
    duration?: number;
    frameRate?: number;
    bitrate?: number;
    codec?: string;
  } {
    const videoStream = mediaInfo.streams.find(stream => stream.codec_type === 'video');
    const duration = parseFloat(mediaInfo.format.duration || '0');
    const bitrate = parseInt(mediaInfo.format.bit_rate || '0');

    if (!videoStream) {
      return { duration, bitrate };
    }

    const frameRate = this.parseFrameRate(videoStream.r_frame_rate);

    return {
      width: videoStream.width,
      height: videoStream.height,
      duration,
      frameRate,
      bitrate,
      codec: videoStream.codec_name,
    };
  }

  public getAudioInfo(mediaInfo: MediaInfo): {
    duration?: number;
    bitrate?: number;
    sampleRate?: number;
    channels?: number;
    codec?: string;
  } {
    const audioStream = mediaInfo.streams.find(stream => stream.codec_type === 'audio');
    const duration = parseFloat(mediaInfo.format.duration || '0');
    const bitrate = parseInt(audioStream?.bit_rate || mediaInfo.format.bit_rate || '0');

    if (!audioStream) {
      return { duration, bitrate };
    }

    return {
      duration,
      bitrate,
      sampleRate: parseInt(audioStream.sample_rate || '0'),
      channels: audioStream.channels,
      codec: audioStream.codec_name,
    };
  }

  private parseFrameRate(frameRateString: string): number {
    if (!frameRateString) return 0;
    
    const parts = frameRateString.split('/');
    if (parts.length === 2) {
      const numerator = parseInt(parts[0]);
      const denominator = parseInt(parts[1]);
      if (denominator !== 0) {
        return numerator / denominator;
      }
    }
    
    return parseFloat(frameRateString) || 0;
  }
}