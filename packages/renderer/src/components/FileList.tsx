import { Trash2, FileVideo, FileAudio, AlertCircle, CheckCircle } from 'lucide-react';
import type { FileItem } from '../types';
import './FileList.css';

interface FileListProps {
  files: FileItem[];
  onRemoveFile: (fileId: string) => void;
}

export function FileList({ files, onRemoveFile }: FileListProps) {
  if (files.length === 0) {
    return null;
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (duration: string | undefined): string => {
    if (!duration) return '--';
    const seconds = parseFloat(duration);
    if (isNaN(seconds)) return '--';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (status: FileItem['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'failed':
        return <AlertCircle size={16} className="text-red-500" />;
      case 'processing':
        return <div className="spinner" />;
      default:
        return null;
    }
  };

  const getFileIcon = (mediaInfo: any) => {
    if (!mediaInfo?.streams) return <FileVideo size={16} />;
    
    const hasVideo = mediaInfo.streams.some((s: any) => s.codec_type === 'video');
    return hasVideo ? <FileVideo size={16} /> : <FileAudio size={16} />;
  };

  return (
    <div className="file-list">
      <h3>ファイル一覧</h3>
      <div className="file-table">
        <div className="file-table-header">
          <div>ファイル</div>
          <div>サイズ</div>
          <div>長さ</div>
          <div>解像度</div>
          <div>状態</div>
          <div>進捗</div>
          <div></div>
        </div>
        
        {files.map((file) => (
          <div key={file.id} className="file-table-row">
            <div className="file-info">
              {getFileIcon(file.mediaInfo)}
              <span className="file-name" title={file.path}>
                {file.name}
              </span>
            </div>
            
            <div className="file-size">
              {formatBytes(file.size)}
            </div>
            
            <div className="file-duration">
              {formatDuration(file.mediaInfo?.format.duration)}
            </div>
            
            <div className="file-resolution">
              {file.mediaInfo?.streams
                .find(s => s.codec_type === 'video')
                ?.width && file.mediaInfo?.streams
                .find(s => s.codec_type === 'video')
                ?.height
                ? `${file.mediaInfo.streams.find(s => s.codec_type === 'video')?.width}×${file.mediaInfo.streams.find(s => s.codec_type === 'video')?.height}`
                : '--'
              }
            </div>
            
            <div className="file-status">
              {getStatusIcon(file.status)}
              <span>{getStatusText(file.status)}</span>
              {file.error && (
                <span className="error-message" title={file.error}>
                  エラー
                </span>
              )}
            </div>
            
            <div className="file-progress">
              {file.status === 'processing' ? (
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${file.progress}%` }}
                  />
                  <span className="progress-text">{Math.round(file.progress)}%</span>
                </div>
              ) : (
                <span>--</span>
              )}
            </div>
            
            <div className="file-actions">
              <button
                onClick={() => onRemoveFile(file.id)}
                className="remove-button"
                title="ファイルを削除"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getStatusText(status: FileItem['status']): string {
  switch (status) {
    case 'pending':
      return '待機中';
    case 'processing':
      return '処理中';
    case 'completed':
      return '完了';
    case 'failed':
      return '失敗';
    default:
      return '--';
  }
}