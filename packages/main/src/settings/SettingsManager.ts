import Store from 'electron-store';
import { join } from 'path';
import { app } from 'electron';
import type { AppSettings } from '../types';

export class SettingsManager {
  private store: Store<AppSettings>;
  private defaultSettings: AppSettings;

  constructor() {
    this.defaultSettings = {
      defaultPreset: 'github-pr',
      maxParallelJobs: 2,
      outputNamingPattern: '{name}_compressed.{ext}',
      defaultOutputDir: join(app.getPath('videos'), 'compressed'),
      theme: 'system',
      language: 'ja',
    };

    this.store = new Store<AppSettings>({
      name: 'video-compressor-settings',
      defaults: this.defaultSettings,
      schema: {
        defaultPreset: {
          type: 'string',
          default: 'github-pr',
        },
        maxParallelJobs: {
          type: 'number',
          minimum: 1,
          maximum: 8,
          default: 2,
        },
        outputNamingPattern: {
          type: 'string',
          default: '{name}_compressed.{ext}',
        },
        defaultOutputDir: {
          type: 'string',
          default: join(app.getPath('videos'), 'compressed'),
        },
        ffmpegPath: {
          type: 'string',
        },
        ffprobePath: {
          type: 'string',
        },
        theme: {
          type: 'string',
          enum: ['light', 'dark', 'system'],
          default: 'system',
        },
        language: {
          type: 'string',
          enum: ['en', 'ja'],
          default: 'ja',
        },
      },
    });
  }

  public getSettings(): AppSettings {
    const settings = this.store.store;
    
    // Validate and merge with defaults
    return {
      ...this.defaultSettings,
      ...settings,
      maxParallelJobs: Math.max(1, Math.min(8, settings.maxParallelJobs || 2)),
    };
  }

  public updateSettings(newSettings: Partial<AppSettings>): void {
    const currentSettings = this.getSettings();
    const updatedSettings = { ...currentSettings, ...newSettings };

    // Validate specific settings
    if (updatedSettings.maxParallelJobs < 1 || updatedSettings.maxParallelJobs > 8) {
      throw new Error('maxParallelJobs must be between 1 and 8');
    }

    if (!updatedSettings.outputNamingPattern.includes('{name}')) {
      throw new Error('outputNamingPattern must include {name} placeholder');
    }

    if (!updatedSettings.outputNamingPattern.includes('{ext}')) {
      throw new Error('outputNamingPattern must include {ext} placeholder');
    }

    // Update store
    for (const [key, value] of Object.entries(newSettings)) {
      this.store.set(key as keyof AppSettings, value);
    }
  }

  public resetSettings(): void {
    this.store.clear();
  }

  public getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.store.get(key) ?? this.defaultSettings[key];
  }

  public setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.store.set(key, value);
  }

  public getStorePath(): string {
    return this.store.path;
  }

  public exportSettings(): AppSettings {
    return this.getSettings();
  }

  public importSettings(settings: Partial<AppSettings>): void {
    // Validate imported settings
    const validatedSettings: Partial<AppSettings> = {};

    if (settings.defaultPreset && typeof settings.defaultPreset === 'string') {
      validatedSettings.defaultPreset = settings.defaultPreset;
    }

    if (settings.maxParallelJobs && typeof settings.maxParallelJobs === 'number' && 
        settings.maxParallelJobs >= 1 && settings.maxParallelJobs <= 8) {
      validatedSettings.maxParallelJobs = settings.maxParallelJobs;
    }

    if (settings.outputNamingPattern && typeof settings.outputNamingPattern === 'string' &&
        settings.outputNamingPattern.includes('{name}') && settings.outputNamingPattern.includes('{ext}')) {
      validatedSettings.outputNamingPattern = settings.outputNamingPattern;
    }

    if (settings.defaultOutputDir && typeof settings.defaultOutputDir === 'string') {
      validatedSettings.defaultOutputDir = settings.defaultOutputDir;
    }

    if (settings.ffmpegPath && typeof settings.ffmpegPath === 'string') {
      validatedSettings.ffmpegPath = settings.ffmpegPath;
    }

    if (settings.ffprobePath && typeof settings.ffprobePath === 'string') {
      validatedSettings.ffprobePath = settings.ffprobePath;
    }

    if (settings.theme && ['light', 'dark', 'system'].includes(settings.theme)) {
      validatedSettings.theme = settings.theme;
    }

    if (settings.language && ['en', 'ja'].includes(settings.language)) {
      validatedSettings.language = settings.language;
    }

    this.updateSettings(validatedSettings);
  }
}