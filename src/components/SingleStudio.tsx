import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Sliders,
  Wand2,
  Copy,
  Check,
  RotateCcw,
  Download,
  Maximize2,
  Palette,
  Film,
  Box,
  Zap,
  Feather,
  Camera,
  Sun,
  Package,
  Compass,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Coins,
  CheckCircle2,
} from 'lucide-react';

import { ApiConfig, GenerationParameters, GeneratedImage, ImageSize } from '../types';
import { generateSeedreamImage } from '../services/arkApi';
import { saveImageToDB } from '../services/db';
import { getModelUnitPrice, formatCost, OFFICIAL_MODEL_PRICING } from '../services/pricing';
import { STYLE_PRESETS, QUICK_MODIFIERS, DEFAULT_PROMPT_EXAMPLES, DEFAULT_NEGATIVE_PROMPT } from '../data/stylePresets';

interface SingleStudioProps {
  apiConfig: ApiConfig;
  onOpenApiKeyModal: () => void;
  onImageGenerated: (image: GeneratedImage) => void;
  recentImages: GeneratedImage[];
  onInspectImage: (image: GeneratedImage) => void;
  initialPrompt?: string;
  initialParams?: Partial<GenerationParameters>;
}

export const SingleStudio: React.FC<SingleStudioProps> = ({
  apiConfig,
  onOpenApiKeyModal,
  onImageGenerated,
  recentImages,
  onInspectImage,
  initialPrompt,
  initialParams,
}) => {
  const [params, setParams] = useState<GenerationParameters>({
    model: initialParams?.model || 'doubao-seedream-5.0-lite',
    prompt: initialPrompt || DEFAULT_PROMPT_EXAMPLES[0],
    negativePrompt: initialParams?.negativePrompt || '',
    sequential_image_generation: initialParams?.sequential_image_generation || 'disabled',
    response_format: initialParams?.response_format || 'b64_json',
    size: initialParams?.size || '2K',
    stream: false,
    watermark: initialParams?.watermark !== undefined ? initialParams.watermark : true,
  });

  const [customModel, setCustomModel] = useState('');
  const [showNegative, setShowNegative] = useState(false);
  const [showStylePresets, setShowStylePresets] = useState(false); // 默认收起避免占空间
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [appliedPresetId, setAppliedPresetId] = useState<string | null>(null);

  // 布局模式：'left-editor'（左侧控制台/右侧大视口，经典推荐）与 'left-image'（左侧视口/右侧控制台）
  const [layoutMode, setLayoutMode] = useState<'left-editor' | 'left-image'>(() => {
    return (localStorage.getItem('SEEDREAM_LAYOUT_MODE') as 'left-editor' | 'left-image') || 'left-editor';
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(recentImages[0] || null);
  const [copied, setCopied] = useState(false);

  const toggleLayoutMode = () => {
    const next = layoutMode === 'left-editor' ? 'left-image' : 'left-editor';
    setLayoutMode(next);
    localStorage.setItem('SEEDREAM_LAYOUT_MODE', next);
  };

  // Sync if initial props change
  useEffect(() => {
    if (initialPrompt) {
      setParams((prev) => ({ ...prev, prompt: initialPrompt }));
    }
  }, [initialPrompt]);

  // Elapsed timer when generating
  useEffect(() => {
    let timer: any = null;
    if (isGenerating) {
      setElapsedSeconds(0);
      timer = setInterval(() => {
        setElapsedSeconds((s) => +(s + 0.1).toFixed(1));
      }, 100);
    } else {
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [isGenerating]);

  // Handle Ctrl+Enter to trigger generation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isGenerating && params.prompt.trim()) {
          handleGenerate();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [params, isGenerating, apiConfig, customModel]);

  const activeModelId = customModel.trim() ? customModel.trim() : params.model;
  const currentUnitPrice = getModelUnitPrice(activeModelId);

  const handleGenerate = async () => {
    if (!apiConfig.apiKey) {
      onOpenApiKeyModal();
      return;
    }

    if (!params.prompt.trim()) {
      setErrorMsg('请输入图像生成提示词');
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);

    const actualModel = customModel.trim() ? customModel.trim() : params.model;
    const finalParams = { ...params, model: actualModel };

    try {
      const result = await generateSeedreamImage(finalParams, apiConfig);

      const newImage: GeneratedImage = {
        id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        prompt: finalParams.prompt,
        negativePrompt: finalParams.negativePrompt,
        model: actualModel,
        size: finalParams.size,
        parameters: finalParams,
        imageUrl: result.imageUrl,
        createdAt: Date.now(),
        durationMs: result.durationMs,
        favorite: false,
        cost: currentUnitPrice,
      };

      // Save to IndexedDB
      await saveImageToDB(newImage);

      setCurrentImage(newImage);
      onImageGenerated(newImage);
    } catch (err: any) {
      setErrorMsg(err.message || '生成失败，请检查网络或参数');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAppendModifier = (text: string) => {
    setParams((prev) => ({
      ...prev,
      prompt: prev.prompt ? `${prev.prompt}，${text}` : text,
    }));
  };

  const handleApplyPreset = (preset: typeof STYLE_PRESETS[0]) => {
    setParams((prev) => {
      let newPrompt = prev.prompt.trim();
      if (!newPrompt.includes(preset.promptSuffix.trim())) {
        newPrompt += preset.promptSuffix;
      }
      return {
        ...prev,
        prompt: newPrompt,
        size: preset.recommendedSize || prev.size,
      };
    });
    setAppliedPresetId(preset.id);
    setTimeout(() => setAppliedPresetId(null), 2500);
  };

  const handleRandomExample = () => {
    const randomIndex = Math.floor(Math.random() * DEFAULT_PROMPT_EXAMPLES.length);
    setParams((prev) => ({ ...prev, prompt: DEFAULT_PROMPT_EXAMPLES[randomIndex] }));
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(params.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sizeOptions: { label: string; value: ImageSize; desc: string }[] = [
    { label: '2K', value: '2K', desc: '高清画质（推荐）' },
    { label: '1K', value: '1K', desc: '标准画质' },
    { label: '1:1 方形', value: '1024x1024', desc: '1024×1024' },
    { label: '16:9 横屏', value: '1280x720', desc: '1280×720' },
    { label: '9:16 竖屏', value: '720x1280', desc: '720×1280' },
    { label: '2:1 宽幅', value: '2048x1024', desc: '2048×1024' },
  ];

  const categories = ['all', '电影与科幻', '3D 与渲染', '写实与摄影', '艺术与传统', '插画与二次元'];

  // Left & Right Panels:
  const renderEditorPanel = () => (
    <div className="space-y-4">
      {/* Main Prompt Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">提示词 (Prompt)</span>
            <span className="text-xs text-slate-400 font-mono">
              {params.prompt.length} 字
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={handleRandomExample}
              className="flex items-center gap-1 text-slate-600 hover:text-blue-600 px-2 py-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5 text-blue-500" />
              <span>随机灵感</span>
            </button>
            <button
              type="button"
              onClick={() => setParams((prev) => ({ ...prev, prompt: '' }))}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>清空</span>
            </button>
            <button
              type="button"
              onClick={handleCopyPrompt}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已复制' : '复制'}</span>
            </button>
          </div>
        </div>

        {/* Prompt Textarea */}
        <div className="relative">
          <textarea
            value={params.prompt}
            onChange={(e) => setParams({ ...params, prompt: e.target.value })}
            rows={4}
            placeholder="输入画面主旨与细节描述，例如：星际穿越，黑洞，末日既视感，复古列车冲出黑洞，oc渲染，光线追踪，超现实主义..."
            className="w-full p-3.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 leading-relaxed text-slate-800 placeholder:text-slate-400 resize-y transition-all"
          />
        </div>

        {/* Negative Prompt Collapsible Toggle */}
        <div className="pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowNegative(!showNegative)}
            className="flex items-center justify-between w-full text-xs font-medium text-slate-600 hover:text-slate-900 py-1 cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-slate-400" />
              <span>负向提示词 (Negative Prompt 过滤)</span>
              {params.negativePrompt && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              )}
            </div>
            {showNegative ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showNegative && (
            <div className="mt-2 space-y-2 animate-in fade-in duration-150">
              <textarea
                value={params.negativePrompt}
                onChange={(e) => setParams({ ...params, negativePrompt: e.target.value })}
                rows={2}
                placeholder="过滤不希望出现的瑕疵：低画质、畸变、多余肢体、马赛克、粗糙线稿..."
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 placeholder:text-slate-400"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <button
                  type="button"
                  onClick={() => setParams({ ...params, negativePrompt: DEFAULT_NEGATIVE_PROMPT })}
                  className="text-blue-600 hover:underline cursor-pointer"
                >
                  填入官方通用防崩坏词库
                </button>
                <span>自动规避肢体畸变与粗糙伪影</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Style Presets Card (Collapsible by default, refined visual beauty) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all">
        {/* Collapsed Header / Summary Bar */}
        <div className="px-4 py-3 flex items-center justify-between gap-3 bg-gradient-to-r from-slate-50/90 via-white to-blue-50/30 border-b border-slate-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <Palette className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-800">风格预设库与快捷修饰词</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  8 款精选
                </span>
              </div>
              {!showStylePresets && (
                <div className="hidden sm:flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 truncate">
                  <span className="text-slate-400">快捷预设:</span>
                  {STYLE_PRESETS.slice(0, 4).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className="hover:text-blue-600 hover:underline cursor-pointer"
                      title={p.description}
                    >
                      {p.shortName}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowStylePresets(!showStylePresets)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium px-2.5 py-1 rounded-lg hover:bg-blue-50/60 transition-colors shrink-0 cursor-pointer"
          >
            <span>{showStylePresets ? '收起预设' : '展开选择'}</span>
            {showStylePresets ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Expanded Style Presets Grid & Modifiers */}
        {showStylePresets && (
          <div className="p-4 space-y-4 animate-in fade-in duration-200">
            {/* Category Filter Pills (hidden scrollbars to avoid ugly native bars) */}
            <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-0.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 text-xs rounded-lg transition-colors whitespace-nowrap font-medium cursor-pointer ${
                    activeCategory === cat
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
                  }`}
                >
                  {cat === 'all' ? '全部风格 (8)' : cat}
                </button>
              ))}
            </div>

            {/* Presets Grid with Soft Tinted Cards & Refined Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {STYLE_PRESETS.filter(
                (p) => activeCategory === 'all' || p.category === activeCategory
              ).map((preset) => {
                const isJustApplied = appliedPresetId === preset.id;
                const renderIcon = () => {
                  switch (preset.icon) {
                    case 'Film':
                      return <Film className="w-3.5 h-3.5" />;
                    case 'Box':
                      return <Box className="w-3.5 h-3.5" />;
                    case 'Zap':
                      return <Zap className="w-3.5 h-3.5" />;
                    case 'Feather':
                      return <Feather className="w-3.5 h-3.5" />;
                    case 'Camera':
                      return <Camera className="w-3.5 h-3.5" />;
                    case 'Sun':
                      return <Sun className="w-3.5 h-3.5" />;
                    case 'Package':
                      return <Package className="w-3.5 h-3.5" />;
                    case 'Compass':
                      return <Compass className="w-3.5 h-3.5" />;
                    default:
                      return <Sparkles className="w-3.5 h-3.5" />;
                  }
                };

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className={`relative group flex flex-col items-start p-3 rounded-xl border bg-gradient-to-br ${
                      preset.colorTheme?.gradient || 'from-slate-50 to-white'
                    } ${
                      preset.colorTheme?.border || 'border-slate-200'
                    } hover:shadow-xs transition-all text-left cursor-pointer hover:-translate-y-0.5`}
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                          preset.colorTheme?.iconBg || 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {renderIcon()}
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${
                          preset.colorTheme?.badgeBg || 'bg-slate-100'
                        } ${preset.colorTheme?.badgeText || 'text-slate-600'}`}
                      >
                        {preset.category.split(' ')[0]}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-800 group-hover:text-blue-700 transition-colors truncate w-full">
                      {preset.shortName || preset.name}
                    </div>

                    <div className="text-[11px] text-slate-400 group-hover:text-slate-600 line-clamp-1 mt-0.5">
                      {preset.shortTag || preset.description}
                    </div>

                    {isJustApplied && (
                      <div className="absolute inset-0 bg-blue-600/90 text-white rounded-xl flex items-center justify-center gap-1 text-xs font-medium animate-in fade-in duration-150">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>已融合进提示词</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Keyword Modifier Chips in a Clean Panel */}
            <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/60 space-y-2">
              <div className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                <span>快捷修饰词标签（点击追加）：</span>
                <span className="text-[10px] text-slate-400 font-normal">支持光影 · 构图 · 画质</span>
              </div>

              <div className="space-y-1.5">
                {QUICK_MODIFIERS.map((group, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <span className="text-[11px] font-medium text-slate-500 py-0.5 shrink-0 w-16">
                      {group.category}:
                    </span>
                    <div className="flex flex-wrap gap-1 flex-1">
                      {group.tags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleAppendModifier(tag)}
                          className="inline-flex items-center gap-0.5 text-[11px] px-2 py-0.5 rounded-md bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/80 hover:border-blue-300 transition-colors shadow-2xs cursor-pointer"
                        >
                          <span className="text-slate-400 font-light">+</span>
                          <span>{tag}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Model & Generation Parameter Controls with Official Pricing */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-800">生成参数控制</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1">
              <Coins className="w-3 h-3 text-emerald-600" />
              <span>官方标准计费</span>
            </span>
          </div>
          <span className="text-[11px] text-slate-400">火山引擎方舟接口</span>
        </div>

        {/* Model Selection with Official Prices */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-slate-600 font-medium">模型选择 (Model)</label>
            <span className="text-[11px] text-emerald-700 font-medium">
              当前单价: {formatCost(currentUnitPrice)} / 张
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
            <button
              type="button"
              onClick={() => {
                setParams({ ...params, model: 'doubao-seedream-5.0-lite' });
                setCustomModel('');
              }}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                params.model === 'doubao-seedream-5.0-lite' && !customModel
                  ? 'border-blue-500 bg-blue-50/50 text-blue-900 ring-1 ring-blue-500'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Seedream 5.0 Lite</span>
                <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded">
                  ¥0.22/张
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">doubao-seedream-5.0-lite</div>
              <div className="text-[10px] text-blue-600 mt-1">官方推荐 · 性价比最高</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setParams({ ...params, model: 'doubao-seedream-5-0-260128' });
                setCustomModel('');
              }}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                params.model === 'doubao-seedream-5-0-260128' && !customModel
                  ? 'border-blue-500 bg-blue-50/50 text-blue-900 ring-1 ring-blue-500'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Seedream 5.0 快照</span>
                <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded">
                  ¥0.22/张
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">doubao-seedream-5-0-260128</div>
              <div className="text-[10px] text-slate-400 mt-1">稳定快照版本</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setParams({ ...params, model: 'doubao-seedream-4.0-lite' });
                setCustomModel('');
              }}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                params.model === 'doubao-seedream-4.0-lite' && !customModel
                  ? 'border-blue-500 bg-blue-50/50 text-blue-900 ring-1 ring-blue-500'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Seedream 4.0 Lite</span>
                <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded">
                  ¥0.18/张
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">doubao-seedream-4.0-lite</div>
              <div className="text-[10px] text-slate-400 mt-1">轻量经济版</div>
            </button>
          </div>

          {/* Custom Model ID */}
          <input
            type="text"
            value={customModel}
            onChange={(e) => setCustomModel(e.target.value)}
            placeholder="或输入火山方舟自定义接入点 ID (如 ep-20250220... 或 doubao-seedream-5.0-pro)"
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-slate-700"
          />
        </div>

        {/* Size & Aspect Ratio Grid */}
        <div>
          <label className="block text-xs text-slate-600 mb-1.5 font-medium">画面尺寸与分辨率 (Size)</label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {sizeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setParams({ ...params, size: opt.value })}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all cursor-pointer ${
                  params.size === opt.value
                    ? 'border-blue-500 bg-blue-50 text-blue-800 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="text-xs">{opt.label}</span>
                <span className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Advanced switches: Sequential, Format, Watermark */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          {/* Sequential */}
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">连续生图控制</label>
            <div className="flex rounded-md border border-slate-200 p-0.5 bg-slate-50">
              <button
                type="button"
                onClick={() => setParams({ ...params, sequential_image_generation: 'disabled' })}
                className={`flex-1 py-1 text-xs rounded transition-colors cursor-pointer ${
                  params.sequential_image_generation === 'disabled'
                    ? 'bg-white shadow-xs font-medium text-slate-800'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                禁用 (默认)
              </button>
              <button
                type="button"
                onClick={() => setParams({ ...params, sequential_image_generation: 'enabled' })}
                className={`flex-1 py-1 text-xs rounded transition-colors cursor-pointer ${
                  params.sequential_image_generation === 'enabled'
                    ? 'bg-white shadow-xs font-medium text-slate-800'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                启用
              </button>
            </div>
          </div>

          {/* Format */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] text-slate-500">返回格式</label>
            </div>
            <div className="flex rounded-md border border-slate-200 p-0.5 bg-slate-50">
              <button
                type="button"
                onClick={() => setParams({ ...params, response_format: 'b64_json' })}
                className={`flex-1 py-1 text-xs rounded transition-colors cursor-pointer ${
                  params.response_format === 'b64_json'
                    ? 'bg-white shadow-xs font-medium text-slate-800'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Base64 (推荐持久)
              </button>
              <button
                type="button"
                onClick={() => setParams({ ...params, response_format: 'url' })}
                className={`flex-1 py-1 text-xs rounded transition-colors cursor-pointer ${
                  params.response_format === 'url'
                    ? 'bg-white shadow-xs font-medium text-slate-800'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                URL 链接
              </button>
            </div>
          </div>

          {/* Watermark */}
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">水印开关</label>
            <div className="flex rounded-md border border-slate-200 p-0.5 bg-slate-50">
              <button
                type="button"
                onClick={() => setParams({ ...params, watermark: false })}
                className={`flex-1 py-1 text-xs rounded transition-colors cursor-pointer ${
                  !params.watermark
                    ? 'bg-white shadow-xs font-medium text-slate-800'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                无水印
              </button>
              <button
                type="button"
                onClick={() => setParams({ ...params, watermark: true })}
                className={`flex-1 py-1 text-xs rounded transition-colors cursor-pointer ${
                  params.watermark
                    ? 'bg-white shadow-xs font-medium text-slate-800'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                保留水印
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message Alert */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
          <div className="flex-1 whitespace-pre-wrap leading-relaxed">{errorMsg}</div>
        </div>
      )}

      {/* Primary Action Button with Cost Notice */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || !params.prompt.trim()}
          className="w-full py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>正在渲染生成中... ({elapsedSeconds}s)</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>立即生成图像</span>
              <span className="text-xs text-blue-200 ml-1 font-normal">(Ctrl+Enter)</span>
            </>
          )}
        </button>

        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <div className="flex items-center gap-1">
            <Coins className="w-3 h-3 text-emerald-600" />
            <span>本次预计计费: </span>
            <span className="font-semibold text-slate-700">{formatCost(currentUnitPrice)}</span>
            <span className="text-slate-400">（按张后付费）</span>
          </div>
          <span>生成结果自动写入本地 IndexedDB</span>
        </div>
      </div>
    </div>
  );

  const renderViewportPanel = () => (
    <div className="space-y-4 lg:sticky lg:top-20">
      {/* Main Visual Display Canvas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">生成视口 (Viewport)</span>
            {currentImage?.cost !== undefined && (
              <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                {formatCost(currentImage.cost)}
              </span>
            )}
          </div>
          {currentImage && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-mono text-[11px] tabular-nums">
                {(currentImage.durationMs / 1000).toFixed(1)}s · {currentImage.size}
              </span>
              <button
                onClick={() => onInspectImage(currentImage)}
                className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                title="放大查看原图与元数据"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <a
                href={currentImage.imageUrl}
                download={`seedream_${currentImage.id}.jpg`}
                target="_blank"
                rel="noreferrer"
                className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                title="下载原图到本地"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        <div className="relative aspect-square w-full bg-slate-100 flex items-center justify-center overflow-hidden">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-3 p-6 text-center animate-pulse">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <Sparkles className="w-6 h-6 animate-spin" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800">豆包 Seedream 模型渲染中</div>
                <div className="text-xs text-slate-500 mt-1">
                  正在调用火山引擎方舟接口 · 已耗时 <span className="font-mono text-blue-600 font-semibold">{elapsedSeconds}s</span>
                </div>
              </div>
            </div>
          ) : currentImage ? (
            <div className="relative w-full h-full group">
              <img
                src={currentImage.imageUrl}
                alt={currentImage.prompt}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain cursor-pointer transition-transform duration-300 group-hover:scale-[1.01]"
                onClick={() => onInspectImage(currentImage)}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <button
                  onClick={() => onInspectImage(currentImage)}
                  className="px-3 py-1.5 rounded-lg bg-white/95 text-slate-800 text-xs font-medium hover:bg-white shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  查看原图与参数
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 p-8 text-center text-slate-400">
              <div className="w-12 h-12 rounded-xl bg-slate-200/60 flex items-center justify-center text-slate-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="text-xs font-medium text-slate-600">暂无当前图像</div>
              <p className="text-[11px] text-slate-400 max-w-xs">
                在控制面板配置提示词与参数后点击「立即生成」，或从下方快速历史流中选图
              </p>
            </div>
          )}
        </div>

        {/* Prompt Caption under Image */}
        {currentImage && (
          <div className="p-3 bg-white border-t border-slate-100 text-xs text-slate-600 flex items-start justify-between gap-3">
            <div className="line-clamp-2 flex-1">
              <span className="font-semibold text-slate-700">描述: </span>
              {currentImage.prompt}
            </div>
            <button
              onClick={() => onInspectImage(currentImage)}
              className="text-[11px] text-blue-600 hover:underline shrink-0 cursor-pointer"
            >
              详情
            </button>
          </div>
        )}
      </div>

      {/* Quick Recent Carousel Strip */}
      {recentImages.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-700">最近生成 (IndexedDB)</span>
            <span className="text-[11px] text-slate-400">点击置入视口</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {recentImages.slice(0, 4).map((img) => (
              <button
                key={img.id}
                onClick={() => setCurrentImage(img)}
                className={`relative aspect-square rounded-lg overflow-hidden border transition-all cursor-pointer ${
                  currentImage?.id === img.id
                    ? 'ring-2 ring-blue-500 border-blue-500'
                    : 'border-slate-200 hover:opacity-90'
                }`}
              >
                <img
                  src={img.imageUrl}
                  alt={img.prompt}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                {img.cost !== undefined && (
                  <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/60 text-[9px] text-white font-mono">
                    {formatCost(img.cost)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-5">
      {/* Top Bar with Layout Switcher & Workspace Stats */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200/60">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-medium text-slate-700">单图精细创作工作室</span>
          <span>·</span>
          <span>当前模型: <strong className="text-slate-800 font-semibold">{activeModelId}</strong></span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline text-emerald-700 font-medium">官方单价: {formatCost(currentUnitPrice)}/张</span>
        </div>

        {/* Layout Toggle Button to address user preference */}
        <button
          type="button"
          onClick={toggleLayoutMode}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
          title="点击切换左右工作台排列顺序"
        >
          <LayoutGrid className="w-3.5 h-3.5 text-blue-600" />
          <span>布局: {layoutMode === 'left-editor' ? '左控制台 / 右视口' : '左视口 / 右控制台'}</span>
        </button>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {layoutMode === 'left-editor' ? (
          <>
            <div className="lg:col-span-6 order-1">{renderEditorPanel()}</div>
            <div className="lg:col-span-6 order-2">{renderViewportPanel()}</div>
          </>
        ) : (
          <>
            <div className="lg:col-span-6 order-1">{renderViewportPanel()}</div>
            <div className="lg:col-span-6 order-2">{renderEditorPanel()}</div>
          </>
        )}
      </div>
    </div>
  );
};
