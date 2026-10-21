import React, { useState } from 'react';
import { Key, Globe, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, X, ShieldCheck } from 'lucide-react';
import { ApiConfig } from '../types';
import { testConnection } from '../services/arkApi';

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
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await testConnection(apiKey, endpointUrl);
    setTestResult(res);
    setTesting(false);
  };

  const handleSave = () => {
    onSave({
      apiKey: apiKey.trim(),
      endpointUrl: endpointUrl.trim(),
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-semibold">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">火山引擎 API 密钥配置 (BYOK)</h3>
              <p className="text-xs text-slate-500">自主管理密钥，数据全本地存储不上传第三方</p>
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
        <div className="p-6 space-y-5">
          {/* Privacy Note */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50/70 border border-blue-100 text-xs text-blue-800">
            <ShieldCheck className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
            <span>
              <strong>安全隐私保障：</strong>您的 ARK API 密钥仅保存在当前浏览器的 LocalStorage 中，直接向火山引擎接口发送请求，绝不经过任何中间开发者服务器。
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
              <span>可在火山方舟控制台创建获取。</span>
              <span className="font-mono text-slate-500">
                支持 LocalStorage 预读: <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700">ARK_API_KEY</code>
              </span>
            </div>
          </div>


          {/* Endpoint URL Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">API 接口端点 (Endpoint URL)</label>
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
              className={`flex items-start gap-2 p-3 rounded-lg text-xs border ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              )}
              <div className="flex-1 whitespace-pre-wrap">{testResult.message}</div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || !apiKey}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
            测试连接
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
            >
              保存配置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
