import { ApiConfig, GenerationParameters } from '../types';

export interface ArkApiResponse {
  created?: number;
  data?: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
  error?: {
    code?: string | number;
    message?: string;
    type?: string;
  };
}

export async function generateSeedreamImage(
  params: GenerationParameters,
  config: ApiConfig
): Promise<{ imageUrl: string; durationMs: number; rawData: any }> {
  const cleanKey = (config.apiKey || '').trim().replace(/^['"`]+|['"`]+$/g, '').trim();
  if (!cleanKey) {
    throw new Error('未配置火山引擎 ARK API Key。请点击右上角「API 密钥设置」填入您的密钥。');
  }

  const startTime = Date.now();
  const endpoint = config.endpointUrl?.trim() || 'https://ark.cn-beijing.volces.com/api/v3/images/generations';

  const payload: Record<string, any> = {
    model: params.model.trim() || 'doubao-seedream-5.0-lite',
    prompt: params.prompt.trim(),
    sequential_image_generation: params.sequential_image_generation || 'disabled',
    response_format: params.response_format || 'b64_json',
    size: params.size || '2K',
    stream: false,
    watermark: params.watermark !== undefined ? params.watermark : true,
  };

  if (params.negativePrompt && params.negativePrompt.trim()) {
    payload.negative_prompt = params.negativePrompt.trim();
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cleanKey}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError') || errorMsg.includes('cors')) {
      throw new Error(
        `网络请求失败（跨域 CORS 拦截）：浏览器直连火山引擎官方接口时受同源策略限制。\n` +
        `解决方案：\n` +
        `1. 在右上角「设置」中配置支持 CORS 的代理/中转端点地址（如 https://corsproxy.io/?url=... 或自定义网关）；\n` +
        `2. 或点击「自动化脚本」一键复制 cURL / Python / Node.js 脚本在终端执行；\n` +
        `3. 或在本地浏览器开启允许跨域调试插件。`
      );
    }
    throw new Error(`网络连接异常：${errorMsg}`);
  }

  const durationMs = Date.now() - startTime;
  let jsonResult: ArkApiResponse;

  try {
    jsonResult = await response.json();
  } catch {
    throw new Error(`接口响应解析失败，HTTP 状态码: ${response.status} ${response.statusText}`);
  }

  if (!response.ok || jsonResult.error) {
    const errorDetail = jsonResult.error?.message || jsonResult.error?.code || response.statusText;
    const errorCode = jsonResult.error?.code || response.status;
    let friendlyMessage = `生图请求失败 [${errorCode}]: ${errorDetail}`;

    const lowerDetail = String(errorDetail).toLowerCase();
    if (lowerDetail.includes('sensitive') || lowerDetail.includes('risk') || lowerDetail.includes('audit') || lowerDetail.includes('moderation')) {
      friendlyMessage = `提示词内容审核拦截：提示词包含敏感或违规词汇，已被火山引擎方舟风控策略拦截，请调整提示词后重试。`;
    } else if (response.status === 401 || lowerDetail.includes('invalidapikey') || lowerDetail.includes('auth')) {
      friendlyMessage = `API Key 鉴权失败 (401)：请检查您的火山引擎 ARK_API_KEY 是否正确有效。`;
    } else if (response.status === 404) {
      friendlyMessage = `模型或接入点未找到 (404)：请检查模型名称或 Endpoint ID「${params.model}」是否已在火山引擎方舟控制台开通。`;
    } else if (response.status === 429) {
      friendlyMessage = `请求频率超限 (429)：并发已达上限或账户额度受限，请稍后重试。`;
    }

    throw new Error(friendlyMessage);
  }

  const firstItem = jsonResult.data?.[0];
  if (!firstItem) {
    throw new Error('接口未返回有效的图像数据');
  }

  let finalImageUrl = '';
  if (firstItem.b64_json) {
    finalImageUrl = firstItem.b64_json.startsWith('data:image/')
      ? firstItem.b64_json
      : `data:image/jpeg;base64,${firstItem.b64_json}`;
  } else if (firstItem.url) {
    finalImageUrl = firstItem.url;
  } else {
    throw new Error('返回的图像数据既不包含 b64_json 也不包含 url');
  }


  return {
    imageUrl: finalImageUrl,
    durationMs,
    rawData: jsonResult,
  };
}

export async function testConnection(apiKey: string, endpointUrl: string, model: string = 'doubao-seedream-5-0-260128') {
  if (!apiKey) {
    return { success: false, message: '请先输入 API Key' };
  }

  try {
    const endpoint = endpointUrl?.trim() || 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: model.trim() || 'doubao-seedream-5-0-260128',
        prompt: 'test prompt',
        size: '1K',
        sequential_image_generation: 'disabled',
        response_format: 'url',
        watermark: true,
      }),
    });

    const data = await response.json();
    if (response.ok && data.data) {
      return { success: true, message: '连接成功，API Key 校验通过！' };
    } else {
      return {
        success: false,
        message: data.error?.message || `校验返回状态码 ${response.status}`,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `连接失败：${err.message || '网络或跨域异常'}`,
    };
  }
}
