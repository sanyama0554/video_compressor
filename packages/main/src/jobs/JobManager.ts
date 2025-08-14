import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { join, dirname, basename, extname } from 'path';
import { existsSync, mkdirSync, statSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import type { 
  JobConfig, 
  JobProgress, 
  CompressionPreset,
  MediaInfo 
} from '../types';
import type { SettingsManager } from '../settings/SettingsManager';
import type { HistoryManager } from '../history/HistoryManager';
import { getResourcePath, isDev, formatBytes, getOutputFilename } from '../utils';

interface ActiveJob {
  id: string;
  config: JobConfig;
  process?: ChildProcess;
  status: 'waiting' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startTime?: number;
  error?: string;
  outputSize?: number;
}

export class JobManager extends EventEmitter {
  private activeJobs = new Map<string, ActiveJob>();
  private jobQueue: string[] = [];
  private runningJobs: string[] = [];
  private ffmpegPath: string;
  private settingsManager: SettingsManager;
  private historyManager: HistoryManager;

  constructor(settingsManager: SettingsManager, historyManager: HistoryManager) {
    super();
    this.settingsManager = settingsManager;
    this.historyManager = historyManager;
    this.ffmpegPath = this.getFfmpegPath();
  }

  private getFfmpegPath(): string {
    const customPath = this.settingsManager.getSetting('ffmpegPath');
    if (customPath && existsSync(customPath)) {
      return customPath;
    }

    if (isDev) {
      const ffmpeg = require('@ffmpeg-installer/ffmpeg');
      return ffmpeg.path;
    } else {
      const platform = process.platform;
      let binaryName: string;
      
      switch (platform) {
        case 'win32':
          binaryName = 'ffmpeg.exe';
          break;
        case 'darwin':
        case 'linux':
          binaryName = 'ffmpeg';
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }
      
      return getResourcePath(join('ffmpeg-installer', 'ffmpeg', binaryName));
    }
  }

  public async startJob(config: JobConfig): Promise<string> {
    const jobId = uuidv4();
    
    // Validate input file
    if (!existsSync(config.inputPath)) {
      throw new Error('Input file does not exist');
    }

    // Ensure output directory exists
    const outputDir = dirname(config.outputPath);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    // Check if output file already exists
    if (existsSync(config.outputPath)) {
      // Generate unique filename
      const { name, ext } = require('path').parse(config.outputPath);
      const timestamp = Date.now();
      config.outputPath = join(outputDir, `${name}_${timestamp}${ext}`);
    }

    const job: ActiveJob = {
      id: jobId,
      config,
      status: 'waiting',
      progress: 0,
    };

    this.activeJobs.set(jobId, job);
    this.jobQueue.push(jobId);
    
    this.processQueue();
    return jobId;
  }

  public async cancelJob(jobId: string): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    if (job.process) {
      job.process.kill('SIGKILL');
    }

    job.status = 'cancelled';
    this.activeJobs.set(jobId, job);
    
    // Remove from queue if waiting
    const queueIndex = this.jobQueue.indexOf(jobId);
    if (queueIndex > -1) {
      this.jobQueue.splice(queueIndex, 1);
    }

    // Remove from running jobs
    const runningIndex = this.runningJobs.indexOf(jobId);
    if (runningIndex > -1) {
      this.runningJobs.splice(runningIndex, 1);
    }

    this.emit('completed', { jobId, success: false, error: 'Job cancelled' });
    this.processQueue();
  }

  public async pauseJob(jobId: string): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    if (job.status === 'running' && job.process) {
      job.process.kill('SIGSTOP');
      job.status = 'paused';
      this.activeJobs.set(jobId, job);
    }
  }

  public async resumeJob(jobId: string): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    if (job.status === 'paused' && job.process) {
      job.process.kill('SIGCONT');
      job.status = 'running';
      this.activeJobs.set(jobId, job);
    }
  }

  public clearCompletedJobs(): void {
    const completedJobIds: string[] = [];
    
    for (const [jobId, job] of this.activeJobs) {
      if (['completed', 'failed', 'cancelled'].includes(job.status)) {
        completedJobIds.push(jobId);
      }
    }

    completedJobIds.forEach(jobId => this.activeJobs.delete(jobId));
  }

  public getActiveJobs(): ActiveJob[] {
    return Array.from(this.activeJobs.values());
  }

  public getJob(jobId: string): ActiveJob | undefined {
    return this.activeJobs.get(jobId);
  }

  private async processQueue(): Promise<void> {
    const maxParallelJobs = this.settingsManager.getSetting('maxParallelJobs');
    
    while (this.runningJobs.length < maxParallelJobs && this.jobQueue.length > 0) {
      const jobId = this.jobQueue.shift()!;
      const job = this.activeJobs.get(jobId);
      
      if (!job || job.status !== 'waiting') {
        continue;
      }

      this.runningJobs.push(jobId);
      this.executeJob(jobId);
    }
  }

  private async executeJob(jobId: string): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) return;

    try {
      job.status = 'running';
      job.startTime = Date.now();
      this.activeJobs.set(jobId, job);

      // Build FFmpeg command
      const args = await this.buildFfmpegArgs(job.config);
      
      if (!existsSync(this.ffmpegPath)) {
        throw new Error(`FFmpeg binary not found at: ${this.ffmpegPath}`);
      }

      // Start FFmpeg process
      const ffmpeg = spawn(this.ffmpegPath, args);
      job.process = ffmpeg;

      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
        this.parseProgress(jobId, stderr);
      });

      ffmpeg.on('close', async (code) => {
        const updatedJob = this.activeJobs.get(jobId);
        if (!updatedJob) return;

        this.runningJobs = this.runningJobs.filter(id => id !== jobId);

        if (code === 0) {
          // Success
          updatedJob.status = 'completed';
          updatedJob.progress = 100;
          
          // Get output file size
          if (existsSync(updatedJob.config.outputPath)) {
            updatedJob.outputSize = statSync(updatedJob.config.outputPath).size;
          }

          // Add to history
          const inputSize = statSync(updatedJob.config.inputPath).size;
          const outputSize = updatedJob.outputSize || 0;
          const compressionRatio = inputSize > 0 ? (outputSize / inputSize) : 1;
          const duration = updatedJob.startTime ? Date.now() - updatedJob.startTime : 0;

          this.historyManager.addItem({
            inputPath: updatedJob.config.inputPath,
            outputPath: updatedJob.config.outputPath,
            preset: updatedJob.config.preset.id,
            originalSize: inputSize,
            compressedSize: outputSize,
            compressionRatio,
            duration,
            status: 'success',
          });

          this.emit('completed', { jobId, success: true });
          this.emit('log', { 
            level: 'info', 
            message: `Job completed: ${basename(updatedJob.config.inputPath)} → ${formatBytes(outputSize)}`, 
            timestamp: Date.now() 
          });
        } else {
          // Failed
          updatedJob.status = 'failed';
          updatedJob.error = `FFmpeg exited with code ${code}. Error: ${stderr.slice(-500)}`;
          
          this.historyManager.addItem({
            inputPath: updatedJob.config.inputPath,
            outputPath: updatedJob.config.outputPath,
            preset: updatedJob.config.preset.id,
            originalSize: statSync(updatedJob.config.inputPath).size,
            compressedSize: 0,
            compressionRatio: 0,
            duration: updatedJob.startTime ? Date.now() - updatedJob.startTime : 0,
            status: 'failed',
            error: updatedJob.error,
          });

          this.emit('completed', { jobId, success: false, error: updatedJob.error });
          this.emit('log', { 
            level: 'error', 
            message: `Job failed: ${basename(updatedJob.config.inputPath)} - ${updatedJob.error}`, 
            timestamp: Date.now() 
          });
        }

        this.activeJobs.set(jobId, updatedJob);
        this.processQueue();
      });

      ffmpeg.on('error', (error) => {
        const updatedJob = this.activeJobs.get(jobId);
        if (!updatedJob) return;

        this.runningJobs = this.runningJobs.filter(id => id !== jobId);
        updatedJob.status = 'failed';
        updatedJob.error = `FFmpeg process error: ${error.message}`;
        this.activeJobs.set(jobId, updatedJob);

        this.emit('completed', { jobId, success: false, error: updatedJob.error });
        this.processQueue();
      });

    } catch (error) {
      job.status = 'failed';
      job.error = (error as Error).message;
      this.activeJobs.set(jobId, job);
      
      this.runningJobs = this.runningJobs.filter(id => id !== jobId);
      this.emit('completed', { jobId, success: false, error: job.error });
      this.processQueue();
    }
  }

  private async buildFfmpegArgs(config: JobConfig): Promise<string[]> {
    const args: string[] = ['-i', config.inputPath];
    const preset = config.preset;

    // Apply custom settings if provided
    const effectivePreset = config.customSettings 
      ? { ...preset, ...config.customSettings }
      : preset;

    // Handle target size mode
    if (config.targetSize && effectivePreset.video?.twoPass) {
      return this.buildTwoPassArgs(config, effectivePreset);
    }

    // Video settings
    if (effectivePreset.video && !effectivePreset.removeVideo) {
      args.push('-c:v', effectivePreset.video.codec);
      
      if (effectivePreset.video.crf !== undefined) {
        args.push('-crf', effectivePreset.video.crf.toString());
      }
      
      if (effectivePreset.video.bitrate) {
        args.push('-b:v', effectivePreset.video.bitrate);
      }
      
      args.push('-preset', effectivePreset.video.preset);
      
      if (effectivePreset.video.profile) {
        args.push('-profile:v', effectivePreset.video.profile);
      }
      
      if (effectivePreset.video.level) {
        args.push('-level', effectivePreset.video.level);
      }
      
      args.push('-pix_fmt', effectivePreset.video.pixelFormat);

      // Resolution scaling
      if (effectivePreset.video.maxWidth || effectivePreset.video.maxHeight) {
        const scale = this.buildScaleFilter(effectivePreset.video.maxWidth, effectivePreset.video.maxHeight);
        args.push('-vf', scale);
      }

      // Frame rate
      if (effectivePreset.video.fps) {
        args.push('-r', effectivePreset.video.fps.toString());
      }
    } else if (effectivePreset.removeVideo) {
      args.push('-vn');
    }

    // Audio settings
    if (effectivePreset.audio && !effectivePreset.removeAudio) {
      args.push('-c:a', effectivePreset.audio.codec);
      args.push('-b:a', effectivePreset.audio.bitrate);
      
      if (effectivePreset.audio.sampleRate) {
        args.push('-ar', effectivePreset.audio.sampleRate.toString());
      }
      
      if (effectivePreset.audio.channels) {
        args.push('-ac', effectivePreset.audio.channels.toString());
      }
    } else if (effectivePreset.removeAudio) {
      args.push('-an');
    }

    // Output settings
    args.push('-y'); // Overwrite output files
    args.push(config.outputPath);

    return args;
  }

  private buildTwoPassArgs(config: JobConfig, preset: CompressionPreset): string[] {
    // Calculate target bitrate
    const targetBitrate = this.calculateTargetBitrate(config.targetSize!, config.inputPath, preset);
    
    // For two-pass, we'll return first pass args and handle second pass in the process
    const args: string[] = [
      '-i', config.inputPath,
      '-c:v', preset.video!.codec,
      '-b:v', targetBitrate,
      '-pass', '1',
      '-an', // No audio for first pass
      '-f', 'mp4'
    ];

    if (process.platform === 'win32') {
      args.push('NUL');
    } else {
      args.push('/dev/null');
    }

    return args;
  }

  private calculateTargetBitrate(targetSizeBytes: number, inputPath: string, preset: CompressionPreset): string {
    // This is a simplified calculation - in a real implementation you'd probe the file for duration
    const durationSeconds = 60; // Default assumption, should be probed
    const audioBitrate = preset.audio ? parseInt(preset.audio.bitrate.replace('k', '')) : 128;
    
    const targetBitsPerSecond = (targetSizeBytes * 8) / durationSeconds;
    const videoBitrate = Math.max(300, Math.min(8000, targetBitsPerSecond - audioBitrate));
    
    return `${Math.round(videoBitrate)}k`;
  }

  private buildScaleFilter(maxWidth?: number, maxHeight?: number): string {
    if (!maxWidth && !maxHeight) {
      return 'scale=-1:-1';
    }
    
    if (maxWidth && maxHeight) {
      return `scale='min(${maxWidth},iw)':'min(${maxHeight},ih)':force_original_aspect_ratio=decrease`;
    }
    
    if (maxWidth) {
      return `scale=${maxWidth}:-1`;
    }
    
    return `scale=-1:${maxHeight}`;
  }

  private parseProgress(jobId: string, stderr: string): void {
    const job = this.activeJobs.get(jobId);
    if (!job) return;

    // Parse FFmpeg progress from stderr
    const timeMatch = stderr.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
    const speedMatch = stderr.match(/speed=\s*([0-9.]+)x/);
    const fpsMatch = stderr.match(/fps=\s*([0-9.]+)/);
    const bitrateMatch = stderr.match(/bitrate=\s*([0-9.]+[kmg]?bits\/s)/);
    const sizeMatch = stderr.match(/size=\s*([0-9]+[kmg]?B)/);

    if (timeMatch) {
      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const seconds = parseFloat(timeMatch[3]);
      const currentTime = hours * 3600 + minutes * 60 + seconds;
      
      // Estimate total duration (this should come from media info in real implementation)
      const estimatedDuration = 300; // 5 minutes default
      const progress = Math.min(100, (currentTime / estimatedDuration) * 100);
      
      job.progress = progress;
    }

    const progressData: JobProgress = {
      jobId,
      fileId: job.config.inputPath,
      status: job.status,
      progress: job.progress,
      speed: speedMatch ? speedMatch[1] + 'x' : undefined,
      fps: fpsMatch ? fpsMatch[1] : undefined,
      bitrate: bitrateMatch ? bitrateMatch[1] : undefined,
      size: sizeMatch ? sizeMatch[1] : undefined,
      time: timeMatch ? `${timeMatch[1]}:${timeMatch[2]}:${timeMatch[3]}` : undefined,
    };

    // Calculate ETA
    if (job.startTime && job.progress > 0) {
      const elapsed = Date.now() - job.startTime;
      const remaining = (elapsed / job.progress) * (100 - job.progress);
      progressData.eta = this.formatDuration(remaining / 1000);
    }

    this.emit('progress', progressData);
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  public cleanup(): void {
    // Cancel all running jobs
    for (const [jobId, job] of this.activeJobs) {
      if (job.process && job.status === 'running') {
        job.process.kill('SIGKILL');
      }
    }
    
    this.activeJobs.clear();
    this.jobQueue.length = 0;
    this.runningJobs.length = 0;
  }
}