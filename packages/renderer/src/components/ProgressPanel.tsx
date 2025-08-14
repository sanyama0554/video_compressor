// React import not needed for JSX with React 17+
import type { FileItem } from '../types';

interface ProgressPanelProps {
  files: FileItem[];
}

export function ProgressPanel({ files }: ProgressPanelProps) {
  return (
    <div style={{ 
      backgroundColor: '#ffffff', 
      border: '1px solid #e9ecef', 
      borderRadius: '8px', 
      padding: '20px' 
    }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>処理中のファイル</h3>
      {files.map(file => (
        <div key={file.id} style={{ marginBottom: '8px' }}>
          <div>{file.name}</div>
          <div>進捗: {Math.round(file.progress)}%</div>
        </div>
      ))}
    </div>
  );
}