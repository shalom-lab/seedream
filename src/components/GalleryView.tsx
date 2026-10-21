import React, { useState } from 'react';
import {
  Image as ImageIcon,
  Search,
  Heart,
  Trash2,
  Download,
  CheckSquare,
  Square,
  Sparkles,
  Maximize2,
  Clock,
  Layers,
  Archive,
  Coins,
} from 'lucide-react';
import { GeneratedImage, GenerationParameters } from '../types';
import { exportImagesToZip } from '../services/zipExport';
import { getModelUnitPrice, formatCost } from '../services/pricing';

interface GalleryViewProps {
  images: GeneratedImage[];
  onSelectImage: (image: GeneratedImage) => void;
  onDeleteImage: (id: string) => void;
  onDeleteMultipleImages: (ids: string[]) => void;
  onToggleFavorite: (id: string) => void;
  onClearAll: () => void;
  onReuseParams: (prompt: string, params: Partial<GenerationParameters>) => void;
}

export const GalleryView: React.FC<GalleryViewProps> = ({
  images,
  onSelectImage,
  onDeleteImage,
  onDeleteMultipleImages,
  onToggleFavorite,
  onClearAll,
  onReuseParams,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isZipping, setIsZipping] = useState(false);
  const [zipStatus, setZipStatus] = useState('');

  // Filter images
  const filteredImages = images.filter((img) => {
    const matchSearch =
      img.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      img.model.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFavorite = onlyFavorites ? img.favorite : true;
    return matchSearch && matchFavorite;
  });

  const isAllSelected =
    filteredImages.length > 0 && selectedIds.length === filteredImages.length;

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredImages.map((img) => img.id));
    }
  };

  const handleBatchZip = async () => {
    const targetImages =
      selectedIds.length > 0
        ? images.filter((img) => selectedIds.includes(img.id))
        : filteredImages;

    if (targetImages.length === 0) {
      alert('无可导出的图片');
      return;
    }

    setIsZipping(true);
    try {
      await exportImagesToZip(
        targetImages,
        `seedream_gallery_${Date.now()}.zip`,
        (pct, status) => setZipStatus(`${pct}% · ${status}`)
      );
    } catch (err: any) {
      alert(`打包失败: ${err.message}`);
    } finally {
      setIsZipping(false);
      setZipStatus('');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (
      confirm(`确认从本地 IndexedDB 数据库中删除所选的 ${selectedIds.length} 张图片吗？`)
    ) {
      onDeleteMultipleImages(selectedIds);
      setSelectedIds([]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Gallery Header Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-blue-600" />
              <span>本地作品历史相册 (IndexedDB 持久化)</span>
              {images.length > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <Coins className="w-3 h-3 text-emerald-600" />
                  <span>累计账单: {formatCost(images.reduce((sum, img) => sum + (img.cost !== undefined ? img.cost : getModelUnitPrice(img.model)), 0))}</span>
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              数据保存在本地浏览器数据库中，页面刷新不丢失，支持多选打包下载与参数回填
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchZip}
              disabled={isZipping || images.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>
                {selectedIds.length > 0
                  ? `打包所选 (${selectedIds.length}) 为 ZIP`
                  : `一键打包全部 (${images.length}) 为 ZIP`}
              </span>
            </button>

            {selectedIds.length > 0 && (
              <button
                onClick={handleBatchDelete}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>批量删除 ({selectedIds.length})</span>
              </button>
            )}

            {images.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('警告：确认清空本地 IndexedDB 中的全部历史作品吗？此操作无法撤销。')) {
                    onClearAll();
                    setSelectedIds([]);
                  }
                }}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="清空全部历史记录"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="搜索提示词关键词或模型..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => setOnlyFavorites(!onlyFavorites)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors shrink-0 ${
                onlyFavorites
                  ? 'bg-rose-50 border-rose-200 text-rose-700 font-medium'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-current text-rose-600' : ''}`} />
              <span>仅看收藏</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-slate-500">
            {filteredImages.length > 0 && (
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-1.5 hover:text-slate-800"
              >
                {isAllSelected ? (
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>{isAllSelected ? '取消全选' : '全选所有'}</span>
              </button>
            )}
            <span className="tabular-nums">
              共 {filteredImages.length} 项 (已选 {selectedIds.length})
            </span>
          </div>
        </div>
      </div>

      {/* Zipping Progress Toast */}
      {zipStatus && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 font-mono">
          {zipStatus}
        </div>
      )}

      {/* Gallery Cards Grid */}
      {filteredImages.length === 0 ? (
        <div className="py-20 text-center text-slate-400 space-y-3 bg-white rounded-xl border border-slate-200">
          <ImageIcon className="w-12 h-12 mx-auto text-slate-300" />
          <div className="text-sm font-semibold text-slate-700">暂无符合条件的图片</div>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {images.length === 0
              ? '您尚未生成任何作品。切换到「单图创作」或「批量生成」开始体验豆包 Seedream 生图吧！'
              : '未找到匹配搜索条件的图片，可尝试调整关键词或筛选条件。'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredImages.map((img) => {
            const isSelected = selectedIds.includes(img.id);
            return (
              <div
                key={img.id}
                className={`group bg-white rounded-xl border overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col ${
                  isSelected ? 'ring-2 ring-blue-500 border-blue-500' : 'border-slate-200'
                }`}
              >
                {/* Image Thumbnail Container */}
                <div className="relative aspect-square w-full bg-slate-100 overflow-hidden cursor-pointer">
                  <img
                    src={img.imageUrl}
                    alt={img.prompt}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onClick={() => onSelectImage(img)}
                  />

                  {/* Multi-select Checkbox (top-left) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSelect(img.id);
                    }}
                    className={`absolute top-2 left-2 p-1 rounded-md backdrop-blur-md transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-black/40 text-white/90 hover:bg-black/60'
                    }`}
                  >
                    {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </button>

                  {/* Favorite Button (top-right) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(img.id);
                    }}
                    className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-md transition-all ${
                      img.favorite
                        ? 'bg-rose-500 text-white'
                        : 'bg-black/40 text-white hover:bg-black/60'
                    }`}
                    title={img.favorite ? '取消收藏' : '加入收藏'}
                  >
                    <Heart className={`w-3.5 h-3.5 ${img.favorite ? 'fill-current' : ''}`} />
                  </button>

                  {/* Quick Action Overlay on hover */}
                  <div
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectImage(img);
                      }}
                      className="px-2.5 py-1 rounded bg-white text-slate-800 text-xs font-medium shadow pointer-events-auto flex items-center gap-1"
                    >
                      <Maximize2 className="w-3 h-3" />
                      详情
                    </button>
                  </div>
                </div>

                {/* Card Footer Details */}
                <div className="p-3 space-y-1.5 flex-1 flex flex-col justify-between text-xs">
                  <div
                    className="text-slate-800 font-medium line-clamp-2 leading-relaxed cursor-pointer hover:text-blue-600"
                    onClick={() => onSelectImage(img)}
                  >
                    {img.prompt}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-mono">{img.size}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-50 text-emerald-700 font-medium">
                        {formatCost(img.cost !== undefined ? img.cost : getModelUnitPrice(img.model))}
                      </span>
                      <span className="tabular-nums">
                        {(img.durationMs / 1000).toFixed(1)}s
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
