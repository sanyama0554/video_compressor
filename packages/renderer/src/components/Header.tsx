// React import not needed for JSX with React 17+
import { Settings, History, Video } from 'lucide-react';
import './Header.css';

interface HeaderProps {
  activeTab: 'main' | 'settings' | 'history';
  onTabChange: (tab: 'main' | 'settings' | 'history') => void;
  processingCount: number;
}

export function Header({ activeTab, onTabChange, processingCount }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-content">
        <div className="app-title">
          <Video size={24} />
          <h1>Video Compressor</h1>
        </div>
        
        <nav className="tab-nav">
          <button 
            className={`tab-button ${activeTab === 'main' ? 'active' : ''}`}
            onClick={() => onTabChange('main')}
          >
            メイン
            {processingCount > 0 && (
              <span className="processing-badge">{processingCount}</span>
            )}
          </button>
          
          <button 
            className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => onTabChange('settings')}
          >
            <Settings size={16} />
            設定
          </button>
          
          <button 
            className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => onTabChange('history')}
          >
            <History size={16} />
            履歴
          </button>
        </nav>
      </div>
    </header>
  );
}