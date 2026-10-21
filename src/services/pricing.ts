/**
 * 火山引擎豆包 Seedream 官方计费规则与单价体系
 * 官方计费方式：按张后付费（按生成成功的实际图片张数计费）
 */

export interface ModelPricingInfo {
  id: string;
  name: string;
  series: string;
  pricePerImage: number; // 单位：人民币 元
  unit: string;
  description: string;
  isRecommended?: boolean;
}

export const OFFICIAL_MODEL_PRICING: Record<string, ModelPricingInfo> = {
  'doubao-seedream-5.0-lite': {
    id: 'doubao-seedream-5.0-lite',
    name: 'Seedream 5.0 Lite',
    series: '5.0 Lite 系列',
    pricePerImage: 0.22,
    unit: '元/张',
    description: '官方推荐 · 0.22元/张 · 速度与画质兼顾',
    isRecommended: true,
  },
  'doubao-seedream-5-0-260128': {
    id: 'doubao-seedream-5-0-260128',
    name: 'Seedream 5.0 快照',
    series: '5.0 快照版',
    pricePerImage: 0.22,
    unit: '元/张',
    description: '官方版本快照 · 0.22元/张',
  },
  'doubao-seedream-5.0-pro': {
    id: 'doubao-seedream-5.0-pro',
    name: 'Seedream 5.0 Pro',
    series: '5.0 Pro 旗舰',
    pricePerImage: 0.30,
    unit: '元/张',
    description: '旗舰级画质 · 0.30元起/张',
  },
  'doubao-seedream-4.0-lite': {
    id: 'doubao-seedream-4.0-lite',
    name: 'Seedream 4.0 Lite',
    series: '4.0 系列',
    pricePerImage: 0.18,
    unit: '元/张',
    description: '经典轻量 · 约0.18元/张',
  },
};

const DEFAULT_FALLBACK_PRICE = 0.22;

/**
 * 获取指定模型的官方单价 (元/张)
 */
export function getModelUnitPrice(modelId: string): number {
  if (!modelId) return DEFAULT_FALLBACK_PRICE;
  const trimmed = modelId.trim();
  if (OFFICIAL_MODEL_PRICING[trimmed]) {
    return OFFICIAL_MODEL_PRICING[trimmed].pricePerImage;
  }
  if (trimmed.includes('5.0-pro') || trimmed.includes('5-0-pro')) {
    return 0.30;
  }
  if (trimmed.includes('4.0') || trimmed.includes('4-0')) {
    return 0.18;
  }
  return DEFAULT_FALLBACK_PRICE;
}

/**
 * 格式化金额展示
 */
export function formatCost(amount: number): string {
  if (amount === 0) return '¥0.00';
  if (amount < 0.01) return `¥${amount.toFixed(3)}`;
  return `¥${amount.toFixed(2)}`;
}

/**
 * 计算批量生图任务总预算
 */
export function calculateBatchBudget(count: number, modelId: string): {
  unitPrice: number;
  totalCost: number;
  formattedTotal: string;
} {
  const unitPrice = getModelUnitPrice(modelId);
  const totalCost = +(count * unitPrice).toFixed(2);
  return {
    unitPrice,
    totalCost,
    formattedTotal: formatCost(totalCost),
  };
}
