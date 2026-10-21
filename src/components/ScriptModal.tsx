import React, { useState } from 'react';
import { X, Copy, Check, Terminal, FileCode2, ShieldAlert } from 'lucide-react';
import { ApiConfig, GenerationParameters } from '../types';
import {
  generateCurlScript,
  generatePythonRequestsScript,
  generateNodeJsScript,
} from '../services/batchEngine';

interface ScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiConfig: ApiConfig;
  currentParams: GenerationParameters;
  promptList?: string[];
}

export const ScriptModal: React.FC<ScriptModalProps> = ({
  isOpen,
  onClose,
  apiConfig,
  currentParams,
  promptList = [],
}) => {
  const [langTab, setLangTab] = useState<'python' | 'nodejs' | 'curl'>('nodejs');
  const [useActualKey, setUseActualKey] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const effectiveConfig: ApiConfig = {
    ...apiConfig,
    apiKey: useActualKey && apiConfig.apiKey ? apiConfig.apiKey : '',
  };

  const prompts = promptList.length > 0 ? promptList : [currentParams.prompt];

  let codeContent = '';
  if (langTab === 'nodejs') {
    codeContent = generateNodeJsScript(currentParams, effectiveConfig, prompts);
  } else if (langTab === 'python') {
    codeContent = generatePythonRequestsScript(currentParams, effectiveConfig, prompts);
  } else {
    codeContent = generateCurlScript(currentParams, effectiveConfig, prompts);
  }


  const handleCopy = () => {
    navigator.clipboard.writeText(codeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileCode2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">离线自动化脚本导出</h3>
              <p className="text-xs text-slate-500">
                实时将当前参数与提示词列表 ({prompts.length} 条) 转为生产环境脚本
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white text-xs">
          {/* Tab selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setLangTab('nodejs')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                langTab === 'nodejs'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Node.js (ESM / Node 18+)</span>
            </button>
            <button
              onClick={() => setLangTab('python')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                langTab === 'python'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Python 自动化脚本</span>
            </button>
            <button
              onClick={() => setLangTab('curl')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                langTab === 'curl'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Shell cURL 命令行</span>
            </button>
          </div>

          {/* Key toggle */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useActualKey}
                onChange={(e) => setUseActualKey(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>在代码中填入当前已存密钥</span>
            </label>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已复制到剪贴板' : '一键复制完整代码'}</span>
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-950 font-mono text-xs text-slate-200">
          <pre className="leading-relaxed whitespace-pre select-text">{codeContent}</pre>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span>可直接在 Linux / macOS / Windows 终端运行</span>
          <span>无需浏览器，纯后台执行</span>
        </div>
      </div>
    </div>
  );
};
