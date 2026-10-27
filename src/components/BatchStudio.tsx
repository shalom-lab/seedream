import React, { useState, useRef } from 'react';
import {
  Layers,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  FileCode2,
  Maximize2,
  FileSpreadsheet,
  Coins,
} from 'lucide-react';
import { ApiConfig, BatchTask, GeneratedImage, GenerationParameters, ImageSize, TemplateVariable } from '../types';
import { parseMultilinePrompts, extractTemplateVariables, expandMatrixTemplate } from '../services/batchEngine';
import { generateSeedreamImage } from '../services/arkApi';
import { saveImageToDB } from '../services/db';
import { exportImagesToZip } from '../services/zipExport';
import { getModelUnitPrice, formatCost } from '../services/pricing';

interface BatchStudioProps {
  apiConfig: ApiConfig;
  onOpenApiKeyModal: () => void;
  onInspectImage: (image: GeneratedImage) => void;
  onOpenScriptWithPrompts: (prompts: string[], params: GenerationParameters) => void;
}

export const BatchStudio: React.FC<BatchStudioProps> = ({
  apiConfig,
  onOpenApiKeyModal,
  onInspectImage,
  onOpenScriptWithPrompts,
}) => {
  const [batchTab, setBatchTab] = useState<'list' | 'matrix'>('list');

  // Parameters applied to all batch tasks
  const [batchParams, setBatchParams] = useState<GenerationParameters>({
    model: apiConfig.defaultModel || 'doubao-seedream-5.0-lite',
    prompt: '',
    sequential_image_generation: 'disabled',
    response_format: 'b64_json',
    size: '2k',
    stream: false,
    watermark: true,
  });


  // Mode 1: Multiline prompts
  const [multilineInput, setMultilineInput] = useState<string>(
    `星际穿越，黑洞，黑洞里冲出一辆快支离破碎的复古列车，抢视觉冲击力，电影大片，末日既视感，oc渲染，光线追踪，超现实主义，深蓝
深海发光水母与未来科技潜艇在深渊中相遇，生物荧光蓝绿光芒，幽暗神秘的海底遗迹，细腻水波光影折射，8K超高清
身着汉服的少女在繁花锦簇的江南烟雨小巷中撑着油纸伞回眸，微风拂动发丝，雨丝如织，淡雅古典意境，写实摄影质感
赛博朋克雨夜街道中的机械重装机甲武士，战甲表面带有磨损刮痕与雨滴流淌，暗红与浅青霓虹倒影，高科技低生活质感`
  );

  // Mode 2: Matrix Template
  const [templateText, setTemplateText] = useState<string>(
    '星际穿越，{主体}冲出黑洞，抢视觉冲击力，{光影}，电影大片，超现实主义，8K超高清'
  );
  const [variables, setVariables] = useState<TemplateVariable[]>([
    {
      id: 'var_1',
      name: '主体',
      options: ['复古列车', '机械巨鲸', '重型宇宙战舰'],
    },
    {
      id: 'var_2',
      name: '光影',
      options: ['丁达尔金色神光', '幽蓝深邃光线追踪', '霓虹高对比耀光'],
    },
  ]);
  const [newVarOptionInput, setNewVarOptionInput] = useState<Record<string, string>>({});

  // Queue state
  const [tasks, setTasks] = useState<BatchTask[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [zipProgress, setZipProgress] = useState<string>('');

  const stopSignalRef = useRef<boolean>(false);

  // Load from Multiline mode
  const handleLoadListTasks = () => {
    const lines = parseMultilinePrompts(multilineInput);
    if (lines.length === 0) {
      alert('请至少输入一行有效的提示词');
      return;
    }
    const newTasks: BatchTask[] = lines.map((p, idx) => ({
      id: `task_${Date.now()}_${idx}`,
      prompt: p,
      status: 'idle',
    }));
    setTasks(newTasks);
  };

  // Load from Matrix Template mode
  const handleLoadMatrixTasks = () => {
    const expanded = expandMatrixTemplate(templateText, variables);
    if (expanded.length === 0) {
      alert('无法展开模版，请检查变量选项');
      return;
    }
    const newTasks: BatchTask[] = expanded.map((item, idx) => ({
      id: `task_mtx_${Date.now()}_${idx}`,
      prompt: item.prompt,
      variables: item.variables,
      status: 'idle',
    }));
    setTasks(newTasks);
  };

  // Add option to variable
  const handleAddOption = (varId: string) => {
    const val = (newVarOptionInput[varId] || '').trim();
    if (!val) return;
    setVariables((prev) =>
      prev.map((v) => (v.id === varId ? { ...v, options: [...v.options, val] } : v))
    );
    setNewVarOptionInput((prev) => ({ ...prev, [varId]: '' }));
  };

  // Remove option from variable
  const handleRemoveOption = (varId: string, optIndex: number) => {
    setVariables((prev) =>
      prev.map((v) =>
        v.id === varId ? { ...v, options: v.options.filter((_, i) => i !== optIndex) } : v
      )
    );
  };

  // Add new variable
  const handleAddNewVariable = () => {
    const varName = prompt('请输入新变量名称（例如：场景、材质、视角）：');
    if (!varName?.trim()) return;
    const cleanName = varName.trim().replace(/[{}]/g, '');
    setVariables((prev) => [
      ...prev,
      {
        id: `var_${Date.now()}`,
        name: cleanName,
        options: ['选项1', '选项2'],
      },
    ]);
    if (!templateText.includes(`{${cleanName}}`)) {
      setTemplateText((prev) => `${prev}，{${cleanName}}`);
    }
  };

  // Execute queue
  const handleStartQueue = async () => {
    if (!apiConfig.apiKey) {
      onOpenApiKeyModal();
      return;
    }

    if (tasks.length === 0) {
      alert('当前队列为空，请先点击「解析并载入队列」');
      return;
    }

    setIsRunning(true);
    setIsPaused(false);
    stopSignalRef.current = false;

    for (let i = 0; i < tasks.length; i++) {
      if (stopSignalRef.current) break;

      // Skip already finished tasks unless user requested retry
      if (tasks[i].status === 'success') continue;

      // Mark running
      setTasks((prev) =>
        prev.map((t, idx) => (idx === i ? { ...t, status: 'running', error: undefined } : t))
      );

      const task = tasks[i];
      try {
        const result = await generateSeedreamImage(
          {
            ...batchParams,
            prompt: task.prompt,
          },
          apiConfig
        );

        const unitCost = getModelUnitPrice(batchParams.model);
        const newImage: GeneratedImage = {
          id: `img_batch_${Date.now()}_${i}`,
          prompt: task.prompt,
          model: batchParams.model,
          size: batchParams.size,
          parameters: { ...batchParams, prompt: task.prompt },
          imageUrl: result.imageUrl,
          createdAt: Date.now(),
          durationMs: result.durationMs,
          favorite: false,
          cost: unitCost,
        };

        // Save to IndexedDB
        await saveImageToDB(newImage);

        // Update task success
        setTasks((prev) =>
          prev.map((t, idx) =>
            idx === i
              ? {
                  ...t,
                  status: 'success',
                  resultImage: newImage,
                  durationMs: result.durationMs,
                }
              : t
          )
        );
      } catch (err: any) {
        setTasks((prev) =>
          prev.map((t, idx) =>
            idx === i
              ? {
                  ...t,
                  status: 'failed',
                  error: err.message || '生成失败',
                }
              : t
          )
        );
      }

      // Small cooldown to prevent rate limit
      if (i < tasks.length - 1 && !stopSignalRef.current) {
        await new Promise((res) => setTimeout(res, 800));
      }
    }

    setIsRunning(false);
  };

  const handleStopQueue = () => {
    stopSignalRef.current = true;
    setIsRunning(false);
  };

  const handleExportBatchZip = async () => {
    const successImages = tasks
      .filter((t) => t.status === 'success' && t.resultImage)
      .map((t) => t.resultImage as GeneratedImage);

    if (successImages.length === 0) {
      alert('当前队列尚无成功生成的图像');
      return;
    }

    setIsZipping(true);
    try {
      await exportImagesToZip(
        successImages,
        `seedream_batch_${Date.now()}.zip`,
        (pct, status) => setZipProgress(`${pct}% · ${status}`)
      );
    } catch (err: any) {
      alert(`打包失败: ${err.message}`);
    } finally {
      setIsZipping(false);
      setZipProgress('');
    }
  };

  const stats = {
    total: tasks.length,
    success: tasks.filter((t) => t.status === 'success').length,
    failed: tasks.filter((t) => t.status === 'failed').length,
    running: tasks.filter((t) => t.status === 'running').length,
    pending: tasks.filter((t) => t.status === 'idle' || t.status === 'pending').length,
  };

  const progressPercent = stats.total > 0 ? Math.round(((stats.success + stats.failed) / stats.total) * 100) : 0;

  // Calculate permutation count
  const matrixCount = variables.reduce((acc, v) => acc * (v.options.length || 1), 1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Configuration & Mode Switch */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>批量生图与模版矩阵调度中心</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              支持多行提示词自动排队或大括号占位符笛卡尔积组合批量执行
            </p>
          </div>

          {/* Mode Switch Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
            <button
              onClick={() => setBatchTab('list')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                batchTab === 'list'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1. 提示词列表队列
            </button>
            <button
              onClick={() => setBatchTab('matrix')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                batchTab === 'matrix'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2. 变量模版批量替换
            </button>
          </div>
        </div>

        {/* Global Parameters Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50/70 p-3 rounded-lg border border-slate-100">
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">批量模型 / 接入点</label>
            <select
              value={batchParams.model}
              onChange={(e) => setBatchParams({ ...batchParams, model: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-slate-700"
            >
              <option value="doubao-seedream-5.0-lite">Seedream 5.0 Lite (带点号标准 · ¥0.22/张)</option>
              <option value="doubao-seedream-5-0-260128">Seedream 5.0 快照 (官方快照 · ¥0.22/张)</option>
              <option value="doubao-seedream-4.0-lite">Seedream 4.0 Lite (¥0.18/张 · 经济版)</option>
              <option value="doubao-seedream-5.0-pro">Seedream 5.0 Pro (¥0.30/张 · 旗舰)</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">画质尺寸</label>
            <select
              value={batchParams.size}
              onChange={(e) => setBatchParams({ ...batchParams, size: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-slate-700"
            >
              <option value="2k">2K 高清 (官方推荐)</option>
              <option value="1024x1024">1024x1024 (1:1 方形)</option>
              <option value="1280x720">1280x720 (16:9 横屏)</option>
              <option value="720x1280">720x1280 (9:16 竖屏)</option>
              <option value="2048x1024">2048x1024 (2:1 宽幅)</option>
              <option value="3k">3K 超清</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">水印选项</label>
            <select
              value={batchParams.watermark ? 'true' : 'false'}
              onChange={(e) => setBatchParams({ ...batchParams, watermark: e.target.value === 'true' })}
              className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-slate-700"
            >
              <option value="false">无水印</option>
              <option value="true">保留水印</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">返回格式</label>
            <select
              value={batchParams.response_format}
              onChange={(e) => setBatchParams({ ...batchParams, response_format: e.target.value as any })}
              className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-slate-700"
            >
              <option value="b64_json">Base64 (推荐: 永久存储无跨域)</option>
              <option value="url">URL 链接 (临时CDN)</option>
            </select>
          </div>

        </div>

        {/* Tab 1 Content: Multiline prompt input */}
        {batchTab === 'list' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">多行提示词输入（每行一条）</span>
              <span className="text-slate-400">已识别 {parseMultilinePrompts(multilineInput).length} 条有效提示词</span>
            </div>
            <textarea
              value={multilineInput}
              onChange={(e) => setMultilineInput(e.target.value)}
              rows={6}
              placeholder="在此粘贴多行提示词，每一行为一个独立的生成任务..."
              className="w-full p-3 text-xs font-mono bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 leading-relaxed"
            />
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleLoadListTasks}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors shadow-xs"
              >
                解析并载入队列 ({parseMultilinePrompts(multilineInput).length} 个任务)
              </button>
              <button
                type="button"
                onClick={() =>
                  onOpenScriptWithPrompts(parseMultilinePrompts(multilineInput), batchParams)
                }
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <FileCode2 className="w-3.5 h-3.5 text-blue-600" />
                导出当前列表自动化脚本
              </button>
            </div>
          </div>
        )}

        {/* Tab 2 Content: Matrix Template Expander */}
        {batchTab === 'matrix' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-700">
                  模版主体提示词（使用大括号包裹变量，如 <code className="text-blue-600">{"{主体}"}</code>、<code className="text-blue-600">{"{光影}"}</code>）
                </span>
                <span className="text-blue-600 font-semibold tabular-nums">
                  笛卡尔积组合数: {matrixCount} 个任务
                </span>
              </div>
              <textarea
                value={templateText}
                onChange={(e) => setTemplateText(e.target.value)}
                rows={3}
                className="w-full p-3 text-xs bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 leading-relaxed"
              />
            </div>

            {/* Variable Matrix Options */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">变量候选词矩阵</span>
                <button
                  type="button"
                  onClick={handleAddNewVariable}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  添加新变量维度
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {variables.map((v) => (
                  <div key={v.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/40 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">
                        {`{${v.name}}`} ({v.options.length} 个备选)
                      </span>
                    </div>

                    {/* Chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {v.options.map((opt, optIdx) => (
                        <span
                          key={optIdx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-white border border-slate-200 text-slate-700"
                        >
                          <span>{opt}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(v.id, optIdx)}
                            className="text-slate-400 hover:text-red-500"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>

                    {/* Add option input */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <input
                        type="text"
                        placeholder="输入词按回车添加..."
                        value={newVarOptionInput[v.id] || ''}
                        onChange={(e) =>
                          setNewVarOptionInput({ ...newVarOptionInput, [v.id]: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddOption(v.id);
                          }
                        }}
                        className="flex-1 px-2 py-1 text-xs bg-white border border-slate-200 rounded focus:outline-hidden focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddOption(v.id)}
                        className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                      >
                        添加
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleLoadMatrixTasks}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors shadow-xs"
              >
                展开笛卡尔积并载入队列 ({matrixCount} 个组合任务)
              </button>
              <button
                type="button"
                onClick={() => {
                  const expanded = expandMatrixTemplate(templateText, variables);
                  onOpenScriptWithPrompts(
                    expanded.map((e) => e.prompt),
                    batchParams
                  );
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <FileCode2 className="w-3.5 h-3.5 text-blue-600" />
                导出矩阵自动化脚本
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Queue Execution Status & Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="font-semibold text-slate-800 text-sm">任务执行队列</span>
            <div className="flex items-center gap-2.5 text-slate-500">
              <span>总数: <strong className="text-slate-800 tabular-nums">{stats.total}</strong></span>
              <span>成功: <strong className="text-emerald-600 tabular-nums">{stats.success}</strong></span>
              <span>失败: <strong className="text-red-600 tabular-nums">{stats.failed}</strong></span>
              <span>等待: <strong className="text-slate-600 tabular-nums">{stats.pending}</strong></span>
            </div>
            {stats.total > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                <Coins className="w-3.5 h-3.5 text-emerald-600" />
                <span>预计预算: <strong>{formatCost(stats.total * getModelUnitPrice(batchParams.model))}</strong></span>
                <span className="text-emerald-600">({formatCost(getModelUnitPrice(batchParams.model))}/张)</span>
                {stats.success > 0 && (
                  <span className="border-l border-emerald-300 pl-1.5 font-medium">
                    已产生: {formatCost(stats.success * getModelUnitPrice(batchParams.model))}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {isRunning ? (
              <button
                type="button"
                onClick={handleStopQueue}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
              >
                <Pause className="w-3.5 h-3.5" />
                停止队列
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartQueue}
                disabled={tasks.length === 0}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs"
              >
                <Play className="w-3.5 h-3.5" />
                开始执行批量任务
              </button>
            )}

            <button
              type="button"
              onClick={handleExportBatchZip}
              disabled={isZipping || stats.success === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              {isZipping ? '正在打包...' : `打包成功结果 (${stats.success}) 为 ZIP`}
            </button>

            <button
              type="button"
              onClick={() => setTasks([])}
              disabled={isRunning || tasks.length === 0}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-40"
              title="清空当前队列"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {stats.total > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>批量进度: {progressPercent}%</span>
              <span>{stats.success + stats.failed} / {stats.total} 完成</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${(stats.success / stats.total) * 100}%` }}
              />
              <div
                className="h-full bg-red-500 transition-all duration-300"
                style={{ width: `${(stats.failed / stats.total) * 100}%` }}
              />
              <div
                className="h-full bg-blue-500 animate-pulse"
                style={{ width: `${(stats.running / stats.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {zipProgress && (
          <div className="text-xs text-blue-600 font-mono bg-blue-50 p-2 rounded border border-blue-100">
            {zipProgress}
          </div>
        )}

        {/* Tasks Grid */}
        {tasks.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2 border border-dashed border-slate-200 rounded-xl">
            <Layers className="w-8 h-8 mx-auto text-slate-300" />
            <div className="text-xs font-medium text-slate-600">当前批量队列为空</div>
            <p className="text-[11px] text-slate-400">
              请在上方输入多行提示词或定义模版矩阵，然后点击「解析并载入队列」
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[550px] overflow-y-auto pr-1">
            {tasks.map((task, idx) => (
              <div
                key={task.id}
                className={`p-3 rounded-lg border text-xs transition-all flex flex-col justify-between ${
                  task.status === 'running'
                    ? 'border-blue-400 bg-blue-50/30 ring-1 ring-blue-400'
                    : task.status === 'success'
                    ? 'border-emerald-200 bg-white'
                    : task.status === 'failed'
                    ? 'border-red-200 bg-red-50/20'
                    : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-slate-400 font-semibold">#{idx + 1}</span>
                    {task.status === 'running' && (
                      <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                        <div className="w-2.5 h-2.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        生成中
                      </span>
                    )}
                    {task.status === 'success' && (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        成功 {task.durationMs ? `(${(task.durationMs / 1000).toFixed(1)}s)` : ''}
                      </span>
                    )}
                    {task.status === 'failed' && (
                      <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                        <XCircle className="w-3.5 h-3.5" />
                        失败
                      </span>
                    )}
                    {task.status === 'idle' && (
                      <span className="text-slate-400">待执行</span>
                    )}
                  </div>

                  {/* Prompt Text */}
                  <div className="text-slate-700 line-clamp-3 leading-relaxed">
                    {task.prompt}
                  </div>

                  {/* Variables badges if matrix */}
                  {task.variables && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {Object.entries(task.variables).map(([k, v]) => (
                        <span
                          key={k}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600"
                        >
                          {k}: {v}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Error if failed */}
                  {task.error && (
                    <div className="text-[11px] text-red-600 p-1.5 rounded bg-red-50 border border-red-100 line-clamp-2">
                      {task.error}
                    </div>
                  )}
                </div>

                {/* Thumbnail Result */}
                {task.resultImage && (
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <img
                      src={task.resultImage.imageUrl}
                      alt={task.prompt}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 object-cover rounded border border-slate-200 cursor-pointer"
                      onClick={() => onInspectImage(task.resultImage!)}
                    />
                    <button
                      type="button"
                      onClick={() => onInspectImage(task.resultImage!)}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Maximize2 className="w-3 h-3" />
                      查看全图
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
