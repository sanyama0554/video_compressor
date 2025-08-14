// React import not needed for JSX with React 17+
import type { AppSettings } from '../types';

interface SettingsPanelProps {
  settings: AppSettings | null;
  onSettingsChange: (settings: AppSettings) => void;
  onSettingsLoad: () => void;
}

export function SettingsPanel({ settings }: SettingsPanelProps) {
  return (
    <div style={{ 
      backgroundColor: '#ffffff', 
      border: '1px solid #e9ecef', 
      borderRadius: '8px', 
      padding: '20px' 
    }}>
      <h2>設定</h2>
      <p>設定パネルは開発中です。</p>
      {settings && (
        <div>
          <p>デフォルトプリセット: {settings.defaultPreset}</p>
          <p>並列ジョブ数: {settings.maxParallelJobs}</p>
          <p>出力フォルダ: {settings.defaultOutputDir}</p>
        </div>
      )}
    </div>
  );
}