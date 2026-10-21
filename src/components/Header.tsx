import { Key, Sparkles, Layers, Image as ImageIcon, Code2, Coins } from 'lucide-react';
import { formatCost } from '../services/pricing';

export type NavTab = 'single' | 'batch' | 'gallery' | 'script';

interface HeaderProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenApiKeyModal: () => void;
  hasApiKey: boolean;
  galleryCount: number;
  totalCost?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenApiKeyModal,
  hasApiKey,
  galleryCount,
  totalCost = 0,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-xs border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark (Single text element) */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
            豆包 Seedream 生图工作台
          </span>
        </div>

        {/* Zone 2: Navigation Links (Clean single-line text tabs) */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => onSelectTab('single')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'single'
                ? 'bg-blue-50 text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>单图创作</span>
          </button>

          <button
            onClick={() => onSelectTab('batch')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'batch'
                ? 'bg-blue-50 text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>批量生成</span>
          </button>

          <button
            onClick={() => onSelectTab('gallery')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'gallery'
                ? 'bg-blue-50 text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>历史画廊</span>
            {galleryCount > 0 && (
              <span className="ml-0.5 text-[10px] tabular-nums font-semibold px-1.5 py-0.2 rounded-full bg-slate-200/80 text-slate-700">
                {galleryCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('script')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'script'
                ? 'bg-blue-50 text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>自动化脚本</span>
          </button>
        </nav>

        {/* Zone 3: Single Primary Action & Billing Summary */}
        <div className="flex items-center gap-2.5 shrink-0">
          {totalCost > 0 && (
            <div
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium"
              title="根据火山引擎官方按张计费标准累计"
            >
              <Coins className="w-3.5 h-3.5 text-emerald-600" />
              <span>累计账单: <strong className="tabular-nums">{formatCost(totalCost)}</strong></span>
            </div>
          )}

          <button
            onClick={onOpenApiKeyModal}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              hasApiKey
                ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100 shadow-xs'
            }`}
          >
            <Key className={`w-3.5 h-3.5 ${hasApiKey ? 'text-blue-600' : 'text-amber-600'}`} />
            <span>{hasApiKey ? 'API 密钥已配置' : '配置 API 密钥'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
