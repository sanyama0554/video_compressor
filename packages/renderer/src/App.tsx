import { useState, useEffect } from 'react';
import { FileDropZone } from './components/FileDropZone';
import { FileList } from './components/FileList';
import { PresetSelector } from './components/PresetSelector';
import { ProgressPanel } from './components/ProgressPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { Header } from './components/Header';
import { DEFAULT_PRESETS, type FileItem, type CompressionPreset, type AppSettings } from './types';
import { PlayCircle, StopCircle } from 'lucide-react';
import './App.css';

function App() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<CompressionPreset>(DEFAULT_PRESETS[0]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [activeTab, setActiveTab] = useState<'main' | 'settings' | 'history'>('main');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Load settings on startup
    loadSettings();
    
    // Set up event listeners
    const progressUnsubscribe = window.videoCompressor.onJobProgress((progress) => {
      setFiles(prevFiles => 
        prevFiles.map(file => 
          file.id === progress.fileId 
            ? { ...file, progress: progress.progress, status: progress.status as any }
            : file
        )
      );
    });

    const completedUnsubscribe = window.videoCompressor.onJobCompleted((result) => {
      setFiles(prevFiles => 
        prevFiles.map(file => 
          file.id === result.jobId
            ? { 
                ...file, 
                status: result.success ? 'completed' : 'failed', 
                error: result.error,
                progress: result.success ? 100 : file.progress
              }
            : file
        )
      );
      
      // Check if all jobs are done
      setIsProcessing(false);
    });

    return () => {
      progressUnsubscribe();
      completedUnsubscribe();
    };
  }, []);

  const loadSettings = async () => {
    try {
      const appSettings = await window.videoCompressor.getSettings();
      setSettings(appSettings);
      
      // Set default preset from settings
      const defaultPreset = DEFAULT_PRESETS.find(p => p.id === appSettings.defaultPreset);
      if (defaultPreset) {
        setSelectedPreset(defaultPreset);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleFilesAdded = async (filePaths: string[]) => {
    const newFiles: FileItem[] = [];
    
    for (const filePath of filePaths) {
      try {
        const mediaInfo = await window.videoCompressor.probeMedia(filePath);
        const fileName = filePath.split(/[\\/]/).pop() || filePath;
        const fileSize = parseInt(mediaInfo.format.size) || 0;
        
        const fileItem: FileItem = {
          id: Date.now().toString() + Math.random().toString(36).substr(2),
          path: filePath,
          name: fileName,
          size: fileSize,
          mediaInfo,
          status: 'pending',
          progress: 0,
        };
        
        newFiles.push(fileItem);
      } catch (error) {
        console.error(`Failed to probe file ${filePath}:`, error);
        // Add file anyway with error status
        const fileName = filePath.split(/[\\/]/).pop() || filePath;
        const fileItem: FileItem = {
          id: Date.now().toString() + Math.random().toString(36).substr(2),
          path: filePath,
          name: fileName,
          size: 0,
          status: 'failed',
          progress: 0,
          error: `Failed to read file: ${(error as Error).message}`,
        };
        newFiles.push(fileItem);
      }
    }
    
    setFiles(prevFiles => [...prevFiles, ...newFiles]);
  };

  const handleStartCompression = async () => {
    if (!settings) return;
    
    const pendingFiles = files.filter(file => file.status === 'pending');
    if (pendingFiles.length === 0) return;

    setIsProcessing(true);

    for (const file of pendingFiles) {
      try {
        const outputPath = generateOutputPath(file.path, settings.outputNamingPattern, settings.defaultOutputDir);
        
        const jobConfig = {
          inputPath: file.path,
          outputPath,
          preset: selectedPreset,
        };

        await window.videoCompressor.startJob(jobConfig);
        
        // Update file with job ID and processing status
        setFiles(prevFiles =>
          prevFiles.map(f =>
            f.id === file.id
              ? { ...f, status: 'processing' as const, progress: 0 }
              : f
          )
        );
        
      } catch (error) {
        console.error(`Failed to start job for ${file.name}:`, error);
        setFiles(prevFiles =>
          prevFiles.map(f =>
            f.id === file.id
              ? { ...f, status: 'failed' as const, error: (error as Error).message }
              : f
          )
        );
      }
    }
  };

  const handleStopCompression = async () => {
    // TODO: Implement job cancellation
    setIsProcessing(false);
  };

  const handleClearCompleted = () => {
    setFiles(prevFiles => prevFiles.filter(file => !['completed', 'failed'].includes(file.status)));
    window.videoCompressor.clearCompletedJobs();
  };

  const handleRemoveFile = (fileId: string) => {
    setFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
  };

  const generateOutputPath = (inputPath: string, pattern: string, outputDir: string): string => {
    const fileName = inputPath.split(/[\\/]/).pop() || '';
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    const ext = selectedPreset.removeVideo ? 'm4a' : 'mp4';
    
    const outputFileName = pattern
      .replace('{name}', nameWithoutExt)
      .replace('{ext}', ext);
    
    return `${outputDir}/${outputFileName}`;
  };

  const handleOpenOutputFolder = async () => {
    if (settings?.defaultOutputDir) {
      await window.videoCompressor.showItemInFolder(settings.defaultOutputDir);
    }
  };

  const processingFiles = files.filter(file => file.status === 'processing');
  const completedFiles = files.filter(file => ['completed', 'failed'].includes(file.status));

  return (
    <div className="app">
      <Header 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        processingCount={processingFiles.length}
      />
      
      <main className="main-content">
        {activeTab === 'main' && (
          <>
            <div className="top-section">
              <FileDropZone onFilesAdded={handleFilesAdded} />
              
              <div className="controls-section">
                <PresetSelector
                  presets={DEFAULT_PRESETS}
                  selectedPreset={selectedPreset}
                  onPresetChange={setSelectedPreset}
                />
                
                <div className="action-buttons">
                  <button 
                    className="btn btn-primary"
                    onClick={handleStartCompression}
                    disabled={isProcessing || files.filter(f => f.status === 'pending').length === 0}
                  >
                    <PlayCircle size={20} />
                    変換開始
                  </button>
                  
                  {isProcessing && (
                    <button 
                      className="btn btn-secondary"
                      onClick={handleStopCompression}
                    >
                      <StopCircle size={20} />
                      停止
                    </button>
                  )}
                  
                  <button 
                    className="btn btn-outline"
                    onClick={handleClearCompleted}
                    disabled={completedFiles.length === 0}
                  >
                    完了済みクリア
                  </button>
                  
                  <button 
                    className="btn btn-outline"
                    onClick={handleOpenOutputFolder}
                    disabled={!settings?.defaultOutputDir}
                  >
                    出力フォルダを開く
                  </button>
                </div>
              </div>
            </div>

            <FileList 
              files={files}
              onRemoveFile={handleRemoveFile}
            />

            {processingFiles.length > 0 && (
              <ProgressPanel files={processingFiles} />
            )}
          </>
        )}

        {activeTab === 'settings' && (
          <SettingsPanel 
            settings={settings}
            onSettingsChange={setSettings}
            onSettingsLoad={loadSettings}
          />
        )}

        {activeTab === 'history' && (
          <HistoryPanel />
        )}
      </main>
    </div>
  );
}

export default App;