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

/**
 * 规范化火山方舟 Seedream size 参数
 * 官方规定 size 必须为 'WIDTHxHEIGHT', '2k', '3k', 或 '4k' 中的一种（注意小写或像素规格）
 */
export function normalizeSeedreamSize(size: string | undefined): string {
  if (!size) return '2k';
  const clean = size.trim();
  const lower = clean.toLowerCase();

  // 若用户传入 1k 或 1K，自动转换为合法的 WIDTHxHEIGHT 规格 1024x1024
  if (lower === '1k') {
    return '1024x1024';
  }

  // 官方支持的预设关键词：2k, 3k, 4k（强制转为小写避免部分端点大小写敏感报错）
  if (lower === '2k' || lower === '3k' || lower === '4k') {
    return lower;
  }

  // 替换 * 或 × 为 x
  const normalizedDim = clean.replace(/[*×]/g, 'x').toLowerCase();
  // 自定义像素规格 WIDTHxHEIGHT (例如 1024x1024, 1280x720, 2048x1024 等)
  if (/^\d+x\d+$/i.test(normalizedDim)) {
    return normalizedDim;
  }

  return '2k';
}

/**
 * 获取模型的优先选名与候选项列表
 * 自动处理带小数点 (5.0 / 4.0) 与连字符 (5-0 / 4-0)、快照名与标准别名的互通
 * 无论用户写 doubao-seedream-5.0-lite、doubao-seedream-5-0-260128 还是其它，都能双向兼容
 */
export function getModelCandidates(model: string | undefined): string[] {
  if (!model) {
    return ['doubao-seedream-5.0-lite', 'doubao-seedream-5-0-260128', 'doubao-seedream-5-0-lite'];
  }
  const clean = model.trim();
  if (clean.startsWith('ep-')) {
    return [clean];
  }
  const lower = clean.toLowerCase();

  // 针对 5.0-lite / 5.0 快照
  if (
    lower === 'doubao-seedream-5.0-lite' ||
    lower === 'seedream-5.0-lite' ||
    lower === '5.0-lite' ||
    lower === 'doubao-seedream-5-0-lite' ||
    lower === 'seedream-5-0-lite'
  ) {
    return ['doubao-seedream-5.0-lite', 'doubao-seedream-5-0-260128', 'doubao-seedream-5-0-lite'];
  }
  if (lower === 'doubao-seedream-5-0-260128' || lower === 'seedream-5-0-260128') {
    return ['doubao-seedream-5-0-260128', 'doubao-seedream-5.0-lite', 'doubao-seedream-5-0-lite'];
  }

  // 针对 4.0-lite
  if (
    lower === 'doubao-seedream-4.0-lite' ||
    lower === 'seedream-4.0-lite' ||
    lower === '4.0-lite' ||
    lower === 'doubao-seedream-4-0-lite' ||
    lower === 'seedream-4-0-lite'
  ) {
    return ['doubao-seedream-4.0-lite', 'doubao-seedream-4-0-lite'];
  }

  // 针对 5.0-pro
  if (
    lower === 'doubao-seedream-5.0-pro' ||
    lower === 'seedream-5.0-pro' ||
    lower === '5.0-pro' ||
    lower === 'doubao-seedream-5-0-pro' ||
    lower === 'seedream-5-0-pro'
  ) {
    return ['doubao-seedream-5.0-pro', 'doubao-seedream-5-0-pro'];
  }

  // 自定义名称：若含点号则衍生连字符版本，反之亦然
  const candidates = [clean];
  if (clean.includes('.')) {
    candidates.push(clean.replace(/\./g, '-'));
  } else if (clean.includes('-')) {
    candidates.push(clean.replace(/(\d+)-(\d+)/g, '$1.$2'));
  }
  return candidates;
}

/**
 * 规范化火山方舟 Seedream 模型/接入点 ID
 */
export function normalizeSeedreamModel(model: string | undefined): string {
  const candidates = getModelCandidates(model);
  return candidates[0] || 'doubao-seedream-5.0-lite';
}

export async function generateSeedreamImage(
  params: GenerationParameters,
  config: ApiConfig
): Promise<{ imageUrl: string; durationMs: number; rawData: any; usedModel: string }> {
  const cleanKey = (config.apiKey || '').trim().replace(/^['"`]+|['"`]+$/g, '').trim();
  if (!cleanKey) {
    throw new Error('未配置火山引擎 ARK API Key。请点击右上角「API 密钥设置」填入您的密钥。');
  }

  const startTime = Date.now();
  const endpoint = config.endpointUrl?.trim() || 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
  
  // 获取候选模型列表：若首选模型因点号/快照差异 404，将自动尝试备选模型，彻底解决 404
  const candidateModels = getModelCandidates(params.model);
  let lastErrorDetail = '';
  let lastStatus = 0;

  for (let i = 0; i < candidateModels.length; i++) {
    const candidateModel = candidateModels[i];
    const payload: Record<string, any> = {
      model: candidateModel,
      prompt: params.prompt.trim(),
      sequential_image_generation: params.sequential_image_generation || 'disabled',
      response_format: params.response_format || 'b64_json',
      size: normalizeSeedreamSize(params.size),
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
          `1. 在右上角「设置」中切换为「CORS 跨域中转节点」或配置反向代理；\n` +
          `2. 或点击「自动化脚本」一键复制 cURL / Python 脚本在终端执行；\n` +
          `3. 或在本地浏览器使用允许跨域扩展。`
        );
      }
      throw new Error(`网络连接异常：${errorMsg}`);
    }

    let jsonResult: ArkApiResponse;
    try {
      jsonResult = await response.json();
    } catch {
      throw new Error(`接口响应解析失败，HTTP 状态码: ${response.status} ${response.statusText}`);
    }

    // 检查是否成功
    if (response.ok && !jsonResult.error && jsonResult.data?.[0]) {
      const durationMs = Date.now() - startTime;
      const firstItem = jsonResult.data[0];
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
        usedModel: candidateModel,
      };
    }

    // 如果失败：检查是否为 404（模型或端点未找到）
    lastStatus = response.status;
    lastErrorDetail = String(jsonResult.error?.message || jsonResult.error?.code || response.statusText);
    const lowerDetail = lastErrorDetail.toLowerCase();

    // 如果是 404 且还有下一个备选模型，则自动尝试备选模型（例如 5.0-lite -> 5-0-260128）
    if ((response.status === 404 || lowerDetail.includes('not found') || lowerDetail.includes('endpoint')) && i < candidateModels.length - 1) {
      console.warn(`[Seedream] 模型 ${candidateModel} 返回 404，正在自动切换备选模型 ${candidateModels[i + 1]} 重试...`);
      continue;
    }

    // 非 404 或已是最后一个候选项，抛出友好错误
    let friendlyMessage = `生图请求失败 [${response.status}]: ${lastErrorDetail}`;
    if (lowerDetail.includes('sensitive') || lowerDetail.includes('risk') || lowerDetail.includes('audit') || lowerDetail.includes('moderation')) {
      friendlyMessage = `提示词内容审核拦截：提示词包含敏感或违规词汇，已被火山引擎方舟风控策略拦截，请调整提示词后重试。`;
    } else if (response.status === 401 || lowerDetail.includes('invalidapikey') || lowerDetail.includes('auth')) {
      friendlyMessage = `API Key 鉴权失败 (401)：请检查您的火山引擎 ARK_API_KEY 是否正确有效。`;
    } else if (response.status === 404 || lowerDetail.includes('not found') || lowerDetail.includes('endpoint')) {
      friendlyMessage =
        `模型或接入点未找到 (404)：当前请求的模型/接入点「${candidateModel}」未在您的火山引擎方舟控制台开通。\n\n` +
        `【为什么填了 Key 还会报 404？】\n` +
        `火山方舟机制：API Key 仅代表账号身份。调用模型时，您的账号必须已在控制台获得该模型授权，或者填入已创建的专属接入点 ID。\n\n` +
        `【解决方案】：\n` +
        `1. (推荐) 如果您在控制台「在线推理 -> 推理接入点」创建了端点，请在模型输入框填入形如「ep-2025xxxx...」的接入点 ID；\n` +
        `2. 或尝试在模型选择中切换为「doubao-seedream-5.0-lite」或「doubao-seedream-4.0-lite」；\n` +
        `3. 前往火山方舟控制台确认已点击开通对应 Seedream 模型。`;
    } else if (response.status === 429) {
      friendlyMessage = `请求频率超限 (429)：并发已达上限或账户额度受限，请稍后重试。`;
    }

    throw new Error(friendlyMessage);
  }

  throw new Error(`请求失败 (${lastStatus}): ${lastErrorDetail}`);
}

export async function testConnection(
  apiKey: string,
  endpointUrl: string,
  model: string = 'doubao-seedream-5.0-lite'
) {
  if (!apiKey) {
    return { success: false, message: '请先输入 API Key' };
  }

  const endpoint = endpointUrl?.trim() || 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
  const candidateModels = getModelCandidates(model.trim() || 'doubao-seedream-5.0-lite');
  let lastError = '';

  for (const targetModel of candidateModels) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: targetModel,
          prompt: 'test seedream connection',
          size: '2k',
          sequential_image_generation: 'disabled',
          response_format: 'url',
          watermark: true,
        }),
      });

      const data = await response.json();
      if (response.ok && (data.data || data.created)) {
        return {
          success: true,
          message: `连接成功，API Key 校验通过！(端点响应正常，已连通可用模型: ${targetModel})`,
        };
      } else {
        const errMsg = data.error?.message || `校验返回状态码 ${response.status}`;
        lastError = errMsg;
        if (response.status === 404 || String(errMsg).includes('404') || String(errMsg).includes('not found')) {
          // Continue to next candidate (e.g. try 5-0-260128 if 5.0-lite failed, or vice versa)
          continue;
        }
        return {
          success: false,
          message: errMsg,
        };
      }
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError') || errorMsg.includes('cors')) {
        return {
          success: false,
          message: `网络连接失败（浏览器跨域 CORS 拦截）：\n浏览器直连火山引擎北京节点时可能受到跨域限制。建议在上方点击选择「CORS 跨域中转节点」或配置自定义代理。`,
        };
      }
      return {
        success: false,
        message: `连接失败：${errorMsg}`,
      };
    }
  }

  return {
    success: false,
    message:
      `模型或接入点未找到 (404)：当前请求的模型/接入点未在您的火山引擎方舟账号开通。\n\n` +
      `【排查建议】：\n` +
      `1. 若您在方舟控制台「在线推理 -> 推理接入点」创建了端点，请直接填入形如「ep-2025xxxx...」的接入点 ID；\n` +
      `2. 若使用官方模型直调，请前往火山方舟控制台确认已点击开通「Seedream」模型。`,
  };
}
