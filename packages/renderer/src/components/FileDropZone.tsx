import { useState, useRef } from 'react';
import { Upload, File } from 'lucide-react';
import './FileDropZone.css';

interface FileDropZoneProps {
  onFilesAdded: (filePaths: string[]) => void;
}

export function FileDropZone({ onFilesAdded }: FileDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev - 1);
    if (dragCounter === 1) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragCounter(0);

    const files = Array.from(e.dataTransfer.files);
    const filePaths = files.map(file => (file as any).path || file.name);
    
    // Filter for supported file types
    const supportedExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm', '.wav', '.mp3', '.m4a', '.aac'];
    const supportedFiles = filePaths.filter(path => 
      supportedExtensions.some(ext => path.toLowerCase().endsWith(ext))
    );

    if (supportedFiles.length > 0) {
      onFilesAdded(supportedFiles);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const filePaths = files.map(file => (file as any).path || file.name);
    
    if (filePaths.length > 0) {
      onFilesAdded(filePaths);
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div 
      className={`file-drop-zone ${isDragOver ? 'drag-over' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleFileSelect}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".mp4,.avi,.mov,.mkv,.wmv,.flv,.webm,.wav,.mp3,.m4a,.aac"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />
      
      <div className="drop-zone-content">
        {isDragOver ? (
          <>
            <Upload size={48} className="drop-icon" />
            <h3>ファイルをドロップしてください</h3>
            <p>動画ファイル（MP4, AVI, MOV等）または音声ファイル（WAV, MP3等）</p>
          </>
        ) : (
          <>
            <File size={48} className="upload-icon" />
            <h3>ファイルを選択またはドラッグ&ドロップ</h3>
            <p>対応形式: MP4, AVI, MOV, MKV, WMV, FLV, WebM, WAV, MP3, M4A, AAC</p>
            <button className="select-button">
              ファイルを選択
            </button>
          </>
        )}
      </div>
    </div>
  );
}