import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  Trash2,
  Heart,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Code,
} from 'lucide-react';
import { GeneratedImage, GenerationParameters } from '../types';

interface ImageDetailModalProps {
  image: GeneratedImage | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onReuseParams: (prompt: string, params: Partial<GenerationParameters>) => void;
}

export const ImageDetailModal: React.FC<ImageDetailModalProps> = ({
  image,
  onClose,
  onDelete,
  onToggleFavorite,
  onReuseParams,
}) => {
  const [copied, setCopied] = useState(false);
  const [showJson, setShowJson] = useState(false);

  if (!image) return null;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(image.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = image.imageUrl;
    link.download = `seedream_${image.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl h-[88vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col md:flex-row">
        {/* Left Side: High-Res Image Display */}
        <div className="flex-1 bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden group">
          <img
            src={image.imageUrl}
            alt={image.prompt}
            referrerPolicy="no-referrer"
            className="max-h-full max-w-full object-contain rounded select-none"
          />

          {/* Floating actions on image */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={() => onToggleFavorite(image.id)}
              className={`p-2 rounded-full backdrop-blur-md transition-colors ${
                image.favorite
                  ? 'bg-rose-500 text-white'
                  : 'bg-black/50 text-white hover:bg-black/70'
              }`}
              title={image.favorite ? '取消收藏' : '加入收藏'}
            >
              <Heart className={`w-4 h-4 ${image.favorite ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-colors"
              title="下载原图"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Side: Parameters & Metadata Sidebar */}
        <div className="w-full md:w-96 flex flex-col border-l border-slate-200 bg-white">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-slate-800">图像作品详情</h3>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content Scrollable */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
            {/* Prompt Box */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-slate-700">生成提示词 (Prompt)</span>
                <button
                  onClick={handleCopyPrompt}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? '已复制' : '复制词'}</span>
                </button>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 leading-relaxed max-h-40 overflow-y-auto select-text">
                {image.prompt}
              </div>
            </div>

            {/* Negative Prompt if exists */}
            {image.negativePrompt && (
              <div>
                <span className="font-semibold text-slate-700 block mb-1">负向过滤词</span>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 leading-relaxed">
                  {image.negativePrompt}
                </div>
              </div>
            )}

            {/* Technical Metadata Table */}
            <div>
              <span className="font-semibold text-slate-700 block mb-2">生成元数据与参数</span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-slate-400">调用模型</div>
                  <div className="font-medium text-slate-800 truncate mt-0.5" title={image.model}>
                    {image.model}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-slate-400">图像规格</div>
                  <div className="font-medium text-slate-800 mt-0.5">{image.size}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-slate-400">渲染耗时</div>
                  <div className="font-medium text-slate-800 mt-0.5 tabular-nums">
                    {(image.durationMs / 1000).toFixed(2)} 秒
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-slate-400">存储引擎</div>
                  <div className="font-medium text-blue-700 mt-0.5">IndexedDB</div>
                </div>
              </div>
              <div className="text-[11px] text-slate-400 mt-2">
                创建时间: {new Date(image.createdAt).toLocaleString('zh-CN')}
              </div>
            </div>

            {/* Raw JSON Parameters Toggle */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowJson(!showJson)}
                className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800"
              >
                <Code className="w-3.5 h-3.5" />
                <span>{showJson ? '收起完整请求 JSON' : '查看完整请求 JSON'}</span>
              </button>
              {showJson && (
                <pre className="mt-2 p-2.5 bg-slate-900 text-slate-200 rounded-lg text-[10px] font-mono overflow-x-auto">
                  {JSON.stringify(image.parameters, null, 2)}
                </pre>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
            <button
              onClick={() => {
                onReuseParams(image.prompt, image.parameters);
                onClose();
              }}
              className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>载入至编辑器重新生成</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="flex-1 py-1.5 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>下载原图</span>
              </button>
              <button
                onClick={() => {
                  if (confirm('确认从本地 IndexedDB 数据库中删除此作品吗？')) {
                    onDelete(image.id);
                    onClose();
                  }
                }}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="删除此记录"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
