import Store from 'electron-store';
import type { HistoryItem } from '../types';

interface HistoryStore {
  items: HistoryItem[];
}

export class HistoryManager {
  private store: Store<HistoryStore>;
  private maxItems: number = 100;

  constructor() {
    this.store = new Store<HistoryStore>({
      name: 'video-compressor-history',
      defaults: {
        items: [],
      },
      schema: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              timestamp: { type: 'number' },
              inputPath: { type: 'string' },
              outputPath: { type: 'string' },
              preset: { type: 'string' },
              originalSize: { type: 'number' },
              compressedSize: { type: 'number' },
              compressionRatio: { type: 'number' },
              duration: { type: 'number' },
              status: { type: 'string', enum: ['success', 'failed'] },
              error: { type: 'string' },
            },
            required: ['id', 'timestamp', 'inputPath', 'outputPath', 'preset', 'originalSize', 'status'],
          },
        },
      },
    });
  }

  public addItem(item: Omit<HistoryItem, 'id' | 'timestamp'>): void {
    const historyItem: HistoryItem = {
      id: this.generateId(),
      timestamp: Date.now(),
      ...item,
    };

    const items = this.store.get('items', []);
    items.unshift(historyItem); // Add to beginning

    // Keep only the most recent items
    if (items.length > this.maxItems) {
      items.splice(this.maxItems);
    }

    this.store.set('items', items);
  }

  public getHistory(limit?: number): HistoryItem[] {
    const items = this.store.get('items', []);
    
    if (limit && limit > 0) {
      return items.slice(0, limit);
    }
    
    return items;
  }

  public getHistoryItem(id: string): HistoryItem | undefined {
    const items = this.store.get('items', []);
    return items.find(item => item.id === id);
  }

  public updateHistoryItem(id: string, updates: Partial<Omit<HistoryItem, 'id' | 'timestamp'>>): boolean {
    const items = this.store.get('items', []);
    const index = items.findIndex(item => item.id === id);
    
    if (index === -1) {
      return false;
    }

    items[index] = { ...items[index], ...updates };
    this.store.set('items', items);
    return true;
  }

  public removeHistoryItem(id: string): boolean {
    const items = this.store.get('items', []);
    const filteredItems = items.filter(item => item.id !== id);
    
    if (filteredItems.length === items.length) {
      return false; // Item not found
    }

    this.store.set('items', filteredItems);
    return true;
  }

  public clearHistory(): void {
    this.store.set('items', []);
  }

  public getStatistics(): {
    totalJobs: number;
    successfulJobs: number;
    failedJobs: number;
    totalOriginalSize: number;
    totalCompressedSize: number;
    averageCompressionRatio: number;
    totalTimeSaved: number;
  } {
    const items = this.store.get('items', []);
    
    const totalJobs = items.length;
    const successfulJobs = items.filter(item => item.status === 'success').length;
    const failedJobs = items.filter(item => item.status === 'failed').length;
    
    const successfulItems = items.filter(item => item.status === 'success');
    const totalOriginalSize = successfulItems.reduce((sum, item) => sum + item.originalSize, 0);
    const totalCompressedSize = successfulItems.reduce((sum, item) => sum + item.compressedSize, 0);
    
    const averageCompressionRatio = successfulItems.length > 0 
      ? successfulItems.reduce((sum, item) => sum + item.compressionRatio, 0) / successfulItems.length
      : 0;
    
    const totalTimeSaved = totalOriginalSize - totalCompressedSize;

    return {
      totalJobs,
      successfulJobs,
      failedJobs,
      totalOriginalSize,
      totalCompressedSize,
      averageCompressionRatio,
      totalTimeSaved,
    };
  }

  public exportHistory(): HistoryItem[] {
    return this.getHistory();
  }

  public importHistory(items: HistoryItem[]): void {
    // Validate and sanitize imported items
    const validItems = items.filter(item => 
      typeof item.id === 'string' &&
      typeof item.timestamp === 'number' &&
      typeof item.inputPath === 'string' &&
      typeof item.outputPath === 'string' &&
      typeof item.preset === 'string' &&
      typeof item.originalSize === 'number' &&
      ['success', 'failed'].includes(item.status)
    );

    // Sort by timestamp (newest first) and limit
    validItems.sort((a, b) => b.timestamp - a.timestamp);
    const limitedItems = validItems.slice(0, this.maxItems);

    this.store.set('items', limitedItems);
  }

  public getRecentPresets(limit: number = 5): string[] {
    const items = this.store.get('items', []);
    const presets = new Set<string>();
    
    for (const item of items) {
      if (item.status === 'success') {
        presets.add(item.preset);
        if (presets.size >= limit) {
          break;
        }
      }
    }
    
    return Array.from(presets);
  }

  public getCompressionTrends(days: number = 30): Array<{
    date: string;
    jobCount: number;
    avgCompressionRatio: number;
    totalSizeSaved: number;
  }> {
    const items = this.store.get('items', []);
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    const recentItems = items.filter(item => 
      item.timestamp >= cutoffTime && item.status === 'success'
    );

    const dailyData = new Map<string, {
      jobs: HistoryItem[];
      sizeSaved: number;
    }>();

    recentItems.forEach(item => {
      const date = new Date(item.timestamp).toISOString().split('T')[0];
      const sizeSaved = item.originalSize - item.compressedSize;
      
      if (!dailyData.has(date)) {
        dailyData.set(date, { jobs: [], sizeSaved: 0 });
      }
      
      const dayData = dailyData.get(date)!;
      dayData.jobs.push(item);
      dayData.sizeSaved += sizeSaved;
    });

    return Array.from(dailyData.entries()).map(([date, data]) => ({
      date,
      jobCount: data.jobs.length,
      avgCompressionRatio: data.jobs.reduce((sum, job) => sum + job.compressionRatio, 0) / data.jobs.length,
      totalSizeSaved: data.sizeSaved,
    })).sort((a, b) => a.date.localeCompare(b.date));
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  public setMaxItems(maxItems: number): void {
    if (maxItems < 1) {
      throw new Error('maxItems must be at least 1');
    }
    
    this.maxItems = maxItems;
    
    // Trim existing items if necessary
    const items = this.store.get('items', []);
    if (items.length > maxItems) {
      this.store.set('items', items.slice(0, maxItems));
    }
  }

  public getMaxItems(): number {
    return this.maxItems;
  }
}