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
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
  Palette,
  Film,
  Box,
  Zap,
  Feather,
  Camera,
  Sun,
  Package,
  Compass,
} from 'lucide-react';

import { ApiConfig, GenerationParameters, GeneratedImage, ImageSize } from '../types';
import { generateSeedreamImage } from '../services/arkApi';
import { saveImageToDB } from '../services/db';
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
  const [showStylePresets, setShowStylePresets] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const [isGenerating, setIsGenerating] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(recentImages[0] || null);
  const [copied, setCopied] = useState(false);

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
  }, [params, isGenerating, apiConfig]);

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Visual Viewport & Quick History (6 cols, sticky) */}
        <div className="lg:col-span-6 space-y-4 lg:sticky lg:top-20 order-2 lg:order-1">
          {/* Main Visual Display Canvas */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs font-semibold text-slate-700">生成视口 (Viewport)</span>
              {currentImage && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-mono text-[11px] tabular-nums">
                    {(currentImage.durationMs / 1000).toFixed(1)}s · {currentImage.size}
                  </span>
                  <button
                    onClick={() => onInspectImage(currentImage)}
                    className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    title="放大查看原图"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={currentImage.imageUrl}
                    download={`seedream_${currentImage.id}.jpg`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    title="下载到本地"
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
                      className="px-3 py-1.5 rounded-lg bg-white/90 text-slate-800 text-xs font-medium hover:bg-white shadow-md flex items-center gap-1.5"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      查看全屏
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
                    在右侧面板配置提示词与参数后点击「立即生成」，或从下方快速历史流中选图
                  </p>
                </div>
              )}
            </div>

            {/* Prompt caption under image */}
            {currentImage && (
              <div className="p-3 bg-white border-t border-slate-100 text-xs text-slate-600 line-clamp-2">
                <span className="font-semibold text-slate-700">描述: </span>
                {currentImage.prompt}
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
                    className={`relative aspect-square rounded-lg overflow-hidden border transition-all ${
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
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Editor & Control Panel (6 cols) */}
        <div className="lg:col-span-6 space-y-5 order-1 lg:order-2">
          {/* Main Prompt Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-800">提示词 (Prompt)</span>
                <span className="text-xs text-slate-400">
                  {params.prompt.length} 字
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleRandomExample}
                  className="flex items-center gap-1 text-slate-600 hover:text-blue-600 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  随机范例
                </button>
                <button
                  type="button"
                  onClick={() => setParams((prev) => ({ ...prev, prompt: '' }))}
                  className="flex items-center gap-1 text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  清空
                </button>
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="flex items-center gap-1 text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? '已复制' : '复制'}
                </button>
              </div>
            </div>

            {/* Prompt Textarea */}
            <div className="relative">
              <textarea
                value={params.prompt}
                onChange={(e) => setParams({ ...params, prompt: e.target.value })}
                rows={5}
                placeholder="在此输入画面描述，例如：星际穿越，黑洞，末日既视感，复古列车冲出黑洞，oc渲染，光线追踪，超现实主义..."
                className="w-full p-3 text-sm bg-slate-50/60 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 leading-relaxed text-slate-800 placeholder:text-slate-400 resize-y"
              />
            </div>

            {/* Negative Prompt Toggle */}
            <div className="pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowNegative(!showNegative)}
                className="flex items-center justify-between w-full text-xs font-medium text-slate-600 hover:text-slate-900 py-1"
              >
                <div className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-slate-400" />
                  <span>负向提示词 (Negative Prompt)</span>
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
                    placeholder="过滤不想出现的元素，如：低画质、畸变、多余的手指、粗糙线稿..."
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 placeholder:text-slate-400"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <button
                      type="button"
                      onClick={() => setParams({ ...params, negativePrompt: DEFAULT_NEGATIVE_PROMPT })}
                      className="text-blue-600 hover:underline"
                    >
                      填入通用负向过滤词
                    </button>
                    <span>用于规避肢体崩坏与粗糙画质</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Style Presets Card (Collapsible & Beautifully Refined) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setShowStylePresets(!showStylePresets)}
              className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-50/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                    <span>风格预设库与快捷修饰词</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-normal bg-blue-50 text-blue-700 border border-blue-100">
                      8大风格预置
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    一键融合科幻、3D、写实、水墨等电影级画风与光影标签
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium shrink-0">
                <span>{showStylePresets ? '收起面板' : '展开选择'}</span>
                {showStylePresets ? (
                  <ChevronUp className="w-4 h-4 text-blue-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-blue-500" />
                )}
              </div>
            </button>

            {showStylePresets && (
              <div className="px-5 pb-5 pt-2 space-y-4 border-t border-slate-100 animate-in fade-in duration-150">
                {/* Category tabs without ugly scrollbars */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-[11px] text-slate-400 whitespace-nowrap hidden sm:inline">
                    按类别筛选：
                  </span>
                  <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-0.5">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-2.5 py-1 text-xs rounded-lg transition-colors whitespace-nowrap font-medium cursor-pointer ${
                          activeCategory === cat
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100/80 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                        }`}
                      >
                        {cat === 'all' ? '全部风格' : cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Presets Grid with Icons & Subtitles */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {STYLE_PRESETS.filter(
                    (p) => activeCategory === 'all' || p.category === activeCategory
                  ).map((preset) => {
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
                        className="group flex flex-col items-start p-3 rounded-xl border border-slate-200/90 hover:border-blue-400 bg-white hover:bg-blue-50/20 text-left transition-all hover:shadow-xs hover:-translate-y-0.5 cursor-pointer"
                      >
                        <div className="flex items-center gap-2 w-full">
                          <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            {renderIcon()}
                          </div>
                          <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-700 truncate flex-1">
                            {preset.shortName || preset.name}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 group-hover:text-slate-600 truncate w-full mt-2 font-normal">
                          {preset.shortTag || preset.description}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Quick Keyword Modifier Chips in a clean structured panel */}
                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/60 space-y-2.5">
                  <div className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                    <span>快捷修饰词库（点击直接追加至提示词）：</span>
                    <span className="text-slate-400 font-normal">光影 · 构图 · 质感</span>
                  </div>

                  <div className="space-y-2">
                    {QUICK_MODIFIERS.map((group, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs">
                        <span className="text-[11px] font-medium text-slate-500 py-0.5 shrink-0 w-16">
                          {group.category}:
                        </span>
                        <div className="flex flex-wrap gap-1.5 flex-1">
                          {group.tags.map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => handleAppendModifier(tag)}
                              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/80 hover:border-blue-300 transition-colors shadow-2xs cursor-pointer"
                            >
                              <span className="text-slate-300 group-hover:text-blue-400 font-light">+</span>
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



          {/* Model & Dimensions Parameter Controls */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800">生成参数控制</span>
              <span className="text-[11px] text-slate-400">支持火山引擎豆包 Seedream 系列模型</span>
            </div>

            {/* Model Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-slate-600 font-medium">模型 (Model / Endpoint)</label>
                <span className="text-[11px] text-blue-600">
                  支持 Seedream 5.0 Lite 系列与自定义 Endpoint ID
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setParams({ ...params, model: 'doubao-seedream-5.0-lite' });
                    setCustomModel('');
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    params.model === 'doubao-seedream-5.0-lite' && !customModel
                      ? 'border-blue-500 bg-blue-50/50 text-blue-900 ring-1 ring-blue-500'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="text-xs font-semibold">Seedream 5.0 Lite</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">doubao-seedream-5.0-lite</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setParams({ ...params, model: 'doubao-seedream-5-0-260128' });
                    setCustomModel('');
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    params.model === 'doubao-seedream-5-0-260128' && !customModel
                      ? 'border-blue-500 bg-blue-50/50 text-blue-900 ring-1 ring-blue-500'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="text-xs font-semibold">Seedream 5.0 快照</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">doubao-seedream-5-0-260128</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setParams({ ...params, model: 'doubao-seedream-4.0-lite' });
                    setCustomModel('');
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    params.model === 'doubao-seedream-4.0-lite' && !customModel
                      ? 'border-blue-500 bg-blue-50/50 text-blue-900 ring-1 ring-blue-500'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="text-xs font-semibold">Seedream 4.0 Lite</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">doubao-seedream-4.0-lite</div>
                </button>
              </div>

              {/* Custom Model ID */}
              <input
                type="text"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="或输入火山方舟自定义接入点 ID (例如 ep-20250220...)"
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
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${
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
                    className={`flex-1 py-1 text-xs rounded transition-colors ${
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
                    className={`flex-1 py-1 text-xs rounded transition-colors ${
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
                  <span className="text-[10px] text-blue-600 font-medium">推荐 Base64 永久存储</span>
                </div>
                <div className="flex rounded-md border border-slate-200 p-0.5 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setParams({ ...params, response_format: 'b64_json' })}
                    className={`flex-1 py-1 text-xs rounded transition-colors ${
                      params.response_format === 'b64_json'
                        ? 'bg-white shadow-xs font-medium text-slate-800'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Base64 (推荐)
                  </button>
                  <button
                    type="button"
                    onClick={() => setParams({ ...params, response_format: 'url' })}
                    className={`flex-1 py-1 text-xs rounded transition-colors ${
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
                    className={`flex-1 py-1 text-xs rounded transition-colors ${
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
                    className={`flex-1 py-1 text-xs rounded transition-colors ${
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

          {/* Primary Action Button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !params.prompt.trim()}
              className="flex-1 py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
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
          </div>
        </div>
      </div>

    </div>
  );
};
