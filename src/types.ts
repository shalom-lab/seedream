export type ImageSize =
  | '2k'
  | '2K'
  | '3k'
  | '4k'
  | '1K'
  | '1024x1024'
  | '1280x720'
  | '720x1280'
  | '2048x1024'
  | '1024x2048'
  | '1920x1080'
  | '1080x1920'
  | string;

export interface GenerationParameters {
  model: string;
  prompt: string;
  negativePrompt?: string;
  sequential_image_generation: 'disabled' | 'enabled';
  response_format: 'url' | 'b64_json';
  size: ImageSize;
  stream: boolean;
  watermark: boolean;
}

export interface GeneratedImage {
  id: string;
  prompt: string;
  negativePrompt?: string;
  model: string;
  size: string;
  parameters: Partial<GenerationParameters>;
  imageUrl: string;
  imageBlob?: Blob;
  createdAt: number;
  durationMs: number;
  favorite: boolean;
  cost?: number;
  width?: number;
  height?: number;
}

export interface BatchTask {
  id: string;
  prompt: string;
  negativePrompt?: string;
  variables?: Record<string, string>;
  status: 'idle' | 'pending' | 'running' | 'success' | 'failed';
  resultImage?: GeneratedImage;
  error?: string;
  durationMs?: number;
}

export interface ApiConfig {
  apiKey: string;
  endpointUrl: string;
  defaultModel?: string;
  isCustomProxy?: boolean;
}

export interface StylePreset {
  id: string;
  name: string;
  shortName?: string;
  shortTag?: string;
  icon?: string;
  category: string;
  description: string;
  promptSuffix: string;
  negativePromptSuffix?: string;
  recommendedSize?: ImageSize;
  colorTheme?: {
    gradient: string;
    border: string;
    badgeBg: string;
    badgeText: string;
    iconBg: string;
    iconColor: string;
  };
}


export interface TemplateVariable {
  id: string;
  name: string;
  options: string[];
}
