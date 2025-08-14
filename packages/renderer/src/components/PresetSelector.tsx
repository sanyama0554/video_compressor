// React import not needed for JSX with React 17+
import type { CompressionPreset } from '../types';
import './PresetSelector.css';

interface PresetSelectorProps {
  presets: CompressionPreset[];
  selectedPreset: CompressionPreset;
  onPresetChange: (preset: CompressionPreset) => void;
}

export function PresetSelector({ presets, selectedPreset, onPresetChange }: PresetSelectorProps) {
  return (
    <div className="preset-selector">
      <h3>圧縮プリセット</h3>
      <div className="preset-options">
        {presets.map((preset) => (
          <label key={preset.id} className="preset-option">
            <input
              type="radio"
              name="preset"
              value={preset.id}
              checked={selectedPreset.id === preset.id}
              onChange={() => onPresetChange(preset)}
            />
            <div className="preset-content">
              <div className="preset-name">{preset.name}</div>
              <div className="preset-description">
                {getPresetDescription(preset)}
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

function getPresetDescription(preset: CompressionPreset): string {
  if (preset.id === 'github-pr') {
    return 'GitHub PRに最適な標準圧縮';
  } else if (preset.id === 'high-compression') {
    return 'ファイルサイズ重視の高圧縮';
  } else if (preset.id === 'quality-priority') {
    return '画質を重視した圧縮';
  } else if (preset.id === 'audio-only') {
    return '音声のみ抽出';
  } else if (preset.id === 'target-size') {
    return '目標サイズに合わせて圧縮';
  }
  return 'カスタム設定';
}