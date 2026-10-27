import React, { useState } from 'react';
import { Key, Globe, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, X, ShieldCheck, Cpu, Coins } from 'lucide-react';
import { ApiConfig } from '../types';
import { testConnection } from '../services/arkApi';
import { OFFICIAL_MODEL_PRICING, formatCost } from '../services/pricing';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ApiConfig;
  onSave: (config: ApiConfig) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, config, onSave }) => {
  const [apiKey, setApiKey] = useState(config.apiKey || '');
  const [endpointUrl, setEndpointUrl] = useState(
    config.endpointUrl || 'https://ark.cn-beijing.volces.com/api/v3/images/generations'
  );
  const [defaultModel, setDefaultModel] = useState(
    config.defaultModel || 'doubao-seedream-5-0-260128'
  );
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await testConnection(apiKey, endpointUrl, defaultModel);
    setTestResult(res);
    setTesting(false);
  };

  const handleSave = () => {
    onSave({
      apiKey: apiKey.trim(),
      endpointUrl: endpointUrl.trim(),
      defaultModel: defaultModel.trim(),
    });
    onClose();
  };

  const presetEndpoints = [
    {
      name: '火山引擎官方北京节点 (默认直连)',
      url: 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
    },
    {
      name: 'CORS 跨域中转节点 (解决浏览器直连限制)',
      url: 'https://corsproxy.io/?url=https://ark.cn-beijing.volces.com/api/v3/images/generations',
    },
  ];

  const popularModels = [
    { id: 'doubao-seedream-5.0-lite', name: '5.0 Lite (带点号标准 · 推荐)', price: '¥0.22/张' },
    { id: 'doubao-seedream-5-0-260128', name: '5.0 快照 (官方快照版)', price: '¥0.22/张' },
    { id: 'doubao-seedream-4.0-lite', name: '4.0 Lite (经典轻量)', price: '¥0.18/张' },
    { id: 'doubao-seedream-5.0-pro', name: '5.0 Pro (旗舰画质)', price: '¥0.30/张' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-semibold">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">火山引擎 API 密钥配置 (BYOK)</h3>
              <p className="text-xs text-slate-500">自主管理密钥，数据全本地存储不上传第三方服务器</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Privacy Note */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50/70 border border-blue-100 text-xs text-blue-800">
            <ShieldCheck className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
            <span>
              <strong>安全隐私保障：</strong>您的 ARK API 密钥仅保存在当前浏览器的 LocalStorage 中，直接向火山引擎接口发送请求，绝不经过任何第三方服务器。
            </span>
          </div>

          {/* API Key Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              火山引擎方舟 API Key <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="例如: 84a7e930-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full pl-3.5 pr-10 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
              <span>可在火山方舟控制台「API Key 管理」创建获取</span>
              <span className="font-mono text-slate-500">
                支持 LocalStorage 预读: <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700">ARK_API_KEY</code>
              </span>
            </div>
          </div>

          {/* Model Selection for Testing & Default */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-slate-500" />
                <span>默认模型 / 接入点 ID (Model / Endpoint ID)</span>
              </label>
              {defaultModel.trim().startsWith('ep-') ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  已识别为专有推理接入点 (ep-*)
                </span>
              ) : (
                <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                  <Coins className="w-3 h-3 text-emerald-600" />
                  <span>支持官方按张计费</span>
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                value={defaultModel}
                onChange={(e) => setDefaultModel(e.target.value)}
                placeholder="例如: doubao-seedream-5-0-260128 或 ep-2025xxxxxx-xxxxx"
                className="w-full pl-3.5 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-slate-700"
              />
            </div>

            {/* Quick Model Presets */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {popularModels.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDefaultModel(item.id)}
                  className={`text-[11px] px-2.5 py-1 rounded border transition-colors flex items-center gap-1 cursor-pointer ${
                    defaultModel === item.id
                      ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{item.name}</span>
                  <span className="text-[10px] text-emerald-700 font-normal">({item.price})</span>
                </button>
              ))}
            </div>
            <div className="text-[11px] text-slate-500 mt-1.5 bg-slate-50 p-2 rounded border border-slate-100 leading-relaxed">
              💡 <strong>为什么填了 Key 会报 404？</strong> 火山方舟要求账号必须在控制台开通对应模型，或在「在线推理」创建接入点获取 <code className="font-mono text-blue-700 bg-white px-1 py-0.2 rounded border border-slate-200">ep-xxxxxxxx</code>。未开通时直接调用会返回 404。
            </div>
          </div>

          {/* Endpoint URL Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <span>API 接口端点 (Endpoint URL)</span>
              </label>
              <span className="text-[11px] text-slate-400">支持自定义反向代理</span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={endpointUrl}
                onChange={(e) => setEndpointUrl(e.target.value)}
                className="w-full pl-3.5 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-slate-700"
              />
            </div>

            {/* Quick Presets */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {presetEndpoints.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setEndpointUrl(preset.url)}
                  className={`text-[11px] px-2.5 py-1 rounded border transition-colors ${
                    endpointUrl === preset.url
                      ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Test connection alert */}
          {testResult && (
            <div
              className={`p-3 rounded-lg text-xs border ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              <div className="flex items-start gap-2">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                )}
                <div className="flex-1 whitespace-pre-wrap leading-relaxed">{testResult.message}</div>
              </div>
              {!testResult.success && (testResult.message.includes('404') || testResult.message.includes('未找到')) && (
                <div className="mt-2.5 pt-2 border-t border-amber-200/80 flex flex-wrap gap-2 items-center text-[11px]">
                  <span className="font-semibold text-amber-900">快捷切换建议：</span>
                  <button
                    type="button"
                    onClick={() => {
                      setDefaultModel('doubao-seedream-5-0-260128');
                      setTestResult(null);
                    }}
                    className="px-2 py-0.5 rounded bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 font-mono cursor-pointer"
                  >
                    切换为 5.0 快照版
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDefaultModel('doubao-seedream-4.0-lite');
                      setTestResult(null);
                    }}
                    className="px-2 py-0.5 rounded bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 font-mono cursor-pointer"
                  >
                    切换为 4.0 Lite
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200 shrink-0">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || !apiKey}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
            测试连接
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              保存配置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
