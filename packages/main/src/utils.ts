import { app } from 'electron';
import { join } from 'path';

export const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

export const getResourcePath = (relativePath: string): string => {
  if (isDev) {
    return join(process.cwd(), relativePath);
  }
  return join(process.resourcesPath, relativePath);
};

export const getAssetPath = (relativePath: string): string => {
  if (isDev) {
    return join(__dirname, '../../../resources', relativePath);
  }
  return join(process.resourcesPath, 'app.asar.unpacked', 'resources', relativePath);
};

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const sanitizeFilename = (filename: string): string => {
  return filename.replace(/[<>:"/\\|?*]/g, '_');
};

export const getOutputFilename = (inputPath: string, pattern: string, extension?: string): string => {
  const { name, ext } = require('path').parse(inputPath);
  const outputExt = extension || ext;
  
  return pattern
    .replace('{name}', name)
    .replace('{ext}', outputExt.startsWith('.') ? outputExt.slice(1) : outputExt);
};