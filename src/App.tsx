import React, { useState, useEffect } from 'react';
import { Header, NavTab } from './components/Header';
import { SingleStudio } from './components/SingleStudio';
import { BatchStudio } from './components/BatchStudio';
import { GalleryView } from './components/GalleryView';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ImageDetailModal } from './components/ImageDetailModal';
import { ScriptModal } from './components/ScriptModal';
import { ApiConfig, GeneratedImage, GenerationParameters } from './types';
import {
  getAllImagesFromDB,
  deleteImageFromDB,
  deleteMultipleImagesFromDB,
  toggleFavoriteInDB,
  clearAllImagesFromDB,
  saveImageToDB,
} from './services/db';
import { DEFAULT_PROMPT_EXAMPLES } from './data/stylePresets';

export const STORAGE_KEY_API_KEY = 'ARK_API_KEY';
export const STORAGE_KEY_CONFIG = 'DOUBAO_ARK_CONFIG_V1';

function sanitizeKey(val: string | null): string {
  if (!val) return '';
  return val.trim().replace(/^['"`]+|['"`]+$/g, '').trim();
}

export function readStoredApiConfig(): ApiConfig {
  let key = '';
  let endpoint = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';

  if (typeof window !== 'undefined') {
    // 1. 优先读取标准纯字符串键名 ARK_API_KEY
    const directKey =
      localStorage.getItem('ARK_API_KEY') ||
      localStorage.getItem('ark_api_key') ||
      localStorage.getItem('VOLC_API_KEY');
    if (directKey) {
      key = sanitizeKey(directKey);
    }

    const directEndpoint =
      localStorage.getItem('ARK_ENDPOINT_URL') ||
      localStorage.getItem('ark_endpoint_url');
    if (directEndpoint && directEndpoint.trim()) {
      endpoint = directEndpoint.trim();
    }

    // 2. 备用读取复合 JSON 对象
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!key && parsed.apiKey) key = sanitizeKey(parsed.apiKey);
        if (parsed.endpointUrl) endpoint = parsed.endpointUrl;
      }
    } catch (e) {
      console.warn('Failed to parse config from localStorage', e);
    }
  }

  return { apiKey: key, endpointUrl: endpoint };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('single');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [inspectingImage, setInspectingImage] = useState<GeneratedImage | null>(null);

  // Script Modal state
  const [scriptPrompts, setScriptPrompts] = useState<string[]>([]);
  const [scriptParams, setScriptParams] = useState<GenerationParameters>({
    model: 'doubao-seedream-5.0-lite',
    prompt: DEFAULT_PROMPT_EXAMPLES[0],
    sequential_image_generation: 'disabled',
    response_format: 'b64_json',
    size: '2K',
    stream: false,
    watermark: true,
  });


  // Editor re-use state
  const [editorInitialPrompt, setEditorInitialPrompt] = useState<string>('');
  const [editorInitialParams, setEditorInitialParams] = useState<Partial<GenerationParameters>>({});

  // BYOK API Configuration
  const [apiConfig, setApiConfig] = useState<ApiConfig>(readStoredApiConfig);

  // Auto-sync if localStorage is changed externally (e.g. from DevTools or other tab)
  useEffect(() => {
    const handleStorageChange = () => {
      const updated = readStoredApiConfig();
      setApiConfig(updated);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
    };
  }, []);

  // IndexedDB Gallery Images
  const [galleryImages, setGalleryImages] = useState<GeneratedImage[]>([]);

  // Load from IndexedDB on startup
  useEffect(() => {
    loadGallery();
  }, []);

  const loadGallery = async () => {
    try {
      const items = await getAllImagesFromDB();
      setGalleryImages(items);
    } catch (err) {
      console.error('加载 IndexedDB 失败:', err);
    }
  };

  const handleSaveApiConfig = (newConfig: ApiConfig) => {
    setApiConfig(newConfig);
    try {
      localStorage.setItem(STORAGE_KEY_API_KEY, newConfig.apiKey);
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(newConfig));
    } catch (e) {
      console.warn('Failed to save config to localStorage', e);
    }
  };


  const handleImageGenerated = (image: GeneratedImage) => {
    setGalleryImages((prev) => [image, ...prev]);
  };

  const handleDeleteImage = async (id: string) => {
    await deleteImageFromDB(id);
    setGalleryImages((prev) => prev.filter((img) => img.id !== id));
    if (inspectingImage?.id === id) {
      setInspectingImage(null);
    }
  };

  const handleDeleteMultipleImages = async (ids: string[]) => {
    await deleteMultipleImagesFromDB(ids);
    setGalleryImages((prev) => prev.filter((img) => !ids.includes(img.id)));
  };

  const handleToggleFavorite = async (id: string) => {
    const newFav = await toggleFavoriteInDB(id);
    setGalleryImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, favorite: newFav } : img))
    );
    if (inspectingImage?.id === id) {
      setInspectingImage((prev) => (prev ? { ...prev, favorite: newFav } : null));
    }
  };

  const handleClearAll = async () => {
    await clearAllImagesFromDB();
    setGalleryImages([]);
    setInspectingImage(null);
  };

  const handleReuseParams = (prompt: string, params: Partial<GenerationParameters>) => {
    setEditorInitialPrompt(prompt);
    setEditorInitialParams(params);
    setActiveTab('single');
  };

  const handleOpenScriptWithPrompts = (prompts: string[], params: GenerationParameters) => {
    setScriptPrompts(prompts);
    setScriptParams(params);
    setIsScriptModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* 3-Zone Top Bar */}
      <Header
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'script') {
            setIsScriptModalOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        hasApiKey={Boolean(apiConfig.apiKey)}
        galleryCount={galleryImages.length}
      />

      {/* Main Workspace Body */}
      <main className="flex-1">
        {/* Banner if no API key is set */}
        {!apiConfig.apiKey && (
          <div className="bg-amber-50/90 border-b border-amber-200/80 px-4 py-2 text-xs text-amber-900 flex items-center justify-between max-w-7xl mx-auto my-2 rounded-lg">
            <span>
              <strong>提示：</strong>当前尚未配置火山引擎 ARK API Key，请点击右侧按钮输入您的密钥即可开始生成图像。
            </span>
            <button
              onClick={() => setIsApiKeyModalOpen(true)}
              className="ml-3 px-2.5 py-1 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded transition-colors shrink-0"
            >
              立即配置密钥 (BYOK)
            </button>
          </div>
        )}

        {activeTab === 'single' && (
          <SingleStudio
            apiConfig={apiConfig}
            onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
            onImageGenerated={handleImageGenerated}
            recentImages={galleryImages}
            onInspectImage={(img) => setInspectingImage(img)}
            initialPrompt={editorInitialPrompt}
            initialParams={editorInitialParams}
          />
        )}

        {activeTab === 'batch' && (
          <BatchStudio
            apiConfig={apiConfig}
            onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
            onInspectImage={(img) => setInspectingImage(img)}
            onOpenScriptWithPrompts={handleOpenScriptWithPrompts}
          />
        )}

        {activeTab === 'gallery' && (
          <GalleryView
            images={galleryImages}
            onSelectImage={(img) => setInspectingImage(img)}
            onDeleteImage={handleDeleteImage}
            onDeleteMultipleImages={handleDeleteMultipleImages}
            onToggleFavorite={handleToggleFavorite}
            onClearAll={handleClearAll}
            onReuseParams={handleReuseParams}
          />
        )}
      </main>

      {/* Clean Light Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span>豆包 Seedream AI 图像生成工作台</span>
            <span className="mx-2 text-slate-300">·</span>
            <span>基于火山引擎方舟平台 API</span>
            <span className="mx-2 text-slate-300">·</span>
            <span>浏览器原生 IndexedDB 强持久化</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>支持 Seedream 5.0 / 4.0</span>
            <span>支持批量模版矩阵</span>
            <span>支持 ZIP 打包归档</span>
          </div>
        </div>
      </footer>

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        config={apiConfig}
        onSave={handleSaveApiConfig}
      />

      {/* Image Detail Lightbox Modal */}
      <ImageDetailModal
        image={inspectingImage}
        onClose={() => setInspectingImage(null)}
        onDelete={handleDeleteImage}
        onToggleFavorite={handleToggleFavorite}
        onReuseParams={handleReuseParams}
      />

      {/* Script Generator Modal */}
      <ScriptModal
        isOpen={isScriptModalOpen}
        onClose={() => setIsScriptModalOpen(false)}
        apiConfig={apiConfig}
        currentParams={scriptParams}
        promptList={scriptPrompts}
      />
    </div>
  );
}
