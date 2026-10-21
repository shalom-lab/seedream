import { ApiConfig, GenerationParameters } from '../types';

export function parseMultilinePrompts(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#') && !line.startsWith('//'));
}

export function extractTemplateVariables(template: string): string[] {
  const matches = template.match(/\{([^{}]+)\}/g);
  if (!matches) return [];
  const names = matches.map((m) => m.slice(1, -1).trim());
  return Array.from(new Set(names)).filter((name) => name.length > 0);
}

export function cartesianProduct<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]];
  return arrays.reduce<T[][]>(
    (acc, curr) => {
      const result: T[][] = [];
      for (const a of acc) {
        for (const c of curr) {
          result.push([...a, c]);
        }
      }
      return result;
    },
    [[]]
  );
}

export function expandMatrixTemplate(
  template: string,
  variables: { name: string; options: string[] }[]
): Array<{ prompt: string; variables: Record<string, string> }> {
  const activeVars = variables.filter((v) => v.options.length > 0);
  if (activeVars.length === 0) {
    return [{ prompt: template.trim(), variables: {} }];
  }

  const optionArrays = activeVars.map((v) => v.options);
  const combinations = cartesianProduct(optionArrays);

  return combinations.map((combo) => {
    let promptResult = template;
    const varMap: Record<string, string> = {};

    combo.forEach((value, index) => {
      const varName = activeVars[index].name;
      varMap[varName] = value;
      // replace all instances of {varName}
      promptResult = promptResult.split(`{${varName}}`).join(value);
    });

    return {
      prompt: promptResult.trim(),
      variables: varMap,
    };
  });
}

export function generateCurlScript(
  params: GenerationParameters,
  config: ApiConfig,
  prompts: string[] = []
): string {
  const endpoint = config.endpointUrl || 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
  const apiKeyPlaceholder = config.apiKey ? config.apiKey : '$ARK_API_KEY';

  if (prompts.length <= 1) {
    const singlePrompt = (prompts[0] || params.prompt).replace(/"/g, '\\"');
    return `#!/bin/bash
# 豆包 Seedream 单图生成自动化脚本
export ARK_API_KEY="${apiKeyPlaceholder}"

curl -X POST "${endpoint}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer \${ARK_API_KEY}" \\
  -d '{
    "model": "${params.model}",
    "prompt": "${singlePrompt}",
    "sequential_image_generation": "${params.sequential_image_generation}",
    "response_format": "${params.response_format}",
    "size": "${params.size}",
    "stream": false,
    "watermark": ${params.watermark}
}'
`;
  }

  // Multi-prompt batch cURL
  const promptListBash = prompts
    .map((p) => `  "${p.replace(/"/g, '\\"')}"`)
    .join('\n');

  return `#!/bin/bash
# 豆包 Seedream 批量生图自动化脚本 (cURL Bash)
export ARK_API_KEY="${apiKeyPlaceholder}"
ENDPOINT="${endpoint}"
MODEL="${params.model}"
SIZE="${params.size}"
WATERMARK=${params.watermark}

PROMPTS=(
${promptListBash}
)

echo "=== 开始批量生成豆包 Seedream 图像，共 \${#PROMPTS[@]} 项 ==="

INDEX=1
for PROMPT in "\${PROMPTS[@]}"; do
  echo "[Task $INDEX/\${#PROMPTS[@]}] 正在请求生成: $PROMPT"
  
  RESPONSE=$(curl -s -X POST "$ENDPOINT" \\
    -H "Content-Type: application/json" \\
    -H "Authorization: Bearer \${ARK_API_KEY}" \\
    -d "{
      \\"model\\": \\"$MODEL\\",
      \\"prompt\\": \\"$PROMPT\\",
      \\"sequential_image_generation\\": \\"${params.sequential_image_generation}\\",
      \\"response_format\\": \\"${params.response_format}\\",
      \\"size\\": \\"$SIZE\\",
      \\"stream\\": false,
      \\"watermark\\": $WATERMARK
    }")
  
  echo "结果: $RESPONSE"
  echo "--------------------------------------------------"
  INDEX=$((INDEX + 1))
  sleep 1
done

echo "=== 全部批量生成任务执行完毕 ==="
`;
}

export function generatePythonRequestsScript(
  params: GenerationParameters,
  config: ApiConfig,
  prompts: string[] = []
): string {
  const endpoint = config.endpointUrl || 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
  const apiKeyPlaceholder = config.apiKey ? config.apiKey : 'YOUR_ARK_API_KEY';
  const promptList = prompts.length > 0 ? prompts : [params.prompt];
  const promptsJson = JSON.stringify(promptList, null, 4);

  return `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
火山引擎 豆包 Seedream 图像生成自动化脚本
功能：支持多参数配置、队列批量请求与自动下载保存
"""

import os
import json
import time
import requests

# 1. 配置参数
ARK_API_KEY = os.getenv("ARK_API_KEY", "${apiKeyPlaceholder}")
ENDPOINT = "${endpoint}"
MODEL = "${params.model}"
SIZE = "${params.size}"
WATERMARK = ${params.watermark ? 'True' : 'False'}
SEQUENTIAL = "${params.sequential_image_generation}"
RESPONSE_FORMAT = "${params.response_format}"

OUTPUT_DIR = "./seedream_output"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 2. 批量提示词列表
PROMPTS = ${promptsJson}

def generate_single_image(prompt: str, index: int):
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {ARK_API_KEY}"
    }
    
    payload = {
        "model": MODEL,
        "prompt": prompt,
        "sequential_image_generation": SEQUENTIAL,
        "response_format": RESPONSE_FORMAT,
        "size": SIZE,
        "stream": False,
        "watermark": WATERMARK
    }
    
    print(f"[{index + 1}/{len(PROMPTS)}] 正在生成: {prompt[:30]}...")
    try:
        resp = requests.post(ENDPOINT, headers=headers, json=payload, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        
        if "data" in data and len(data["data"]) > 0:
            item = data["data"][0]
            if "url" in item and item["url"]:
                img_url = item["url"]
                print(f" -> 图像生成成功，下载中: {img_url[:60]}...")
                img_data = requests.get(img_url, timeout=30).content
                filename = os.path.join(OUTPUT_DIR, f"seedream_{index + 1:03d}.jpg")
                with open(filename, "wb") as f:
                    f.write(img_data)
                print(f" -> 已保存至: {filename}")
            elif "b64_json" in item and item["b64_json"]:
                import base64
                filename = os.path.join(OUTPUT_DIR, f"seedream_{index + 1:03d}.jpg")
                with open(filename, "wb") as f:
                    f.write(base64.b64decode(item["b64_json"]))
                print(f" -> Base64 图像已解码保存至: {filename}")
        else:
            print(f" -> 未知返回结构: {data}")
    except Exception as e:
        print(f" -> 生成失败: {e}")

def main():
    if ARK_API_KEY == "YOUR_ARK_API_KEY" or not ARK_API_KEY:
        print("警告: 请在脚本中填入 ARK_API_KEY 或设置环境变量 export ARK_API_KEY='...'")
    
    print(f"=== 开始运行 Seedream 批量生图任务，共 {len(PROMPTS)} 个任务 ===")
    for idx, p in enumerate(PROMPTS):
        generate_single_image(p, idx)
        if idx < len(PROMPTS) - 1:
            time.sleep(1.0) # 控制频次
    print("=== 所有任务已全部完成！===")

if __name__ == "__main__":
    main()
`;
}

export function generateNodeJsScript(
  params: GenerationParameters,
  config: ApiConfig,
  prompts: string[] = []
): string {
  const endpoint = config.endpointUrl || 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
  const apiKeyPlaceholder = config.apiKey ? config.apiKey : 'YOUR_ARK_API_KEY';
  const promptList = prompts.length > 0 ? prompts : [params.prompt];
  const promptsJson = JSON.stringify(promptList, null, 2);

  return `/**
 * 火山引擎 豆包 Seedream 批量生图自动化脚本 (Node.js ESM)
 * 运行方式: node seedream_batch.mjs
 * 依赖环境: Node.js 18+ (内置原生 fetch 与 Buffer)
 */

import fs from 'node:fs';
import path from 'node:path';

// 1. 配置参数
const ARK_API_KEY = process.env.ARK_API_KEY || "${apiKeyPlaceholder}";
const ENDPOINT = "${endpoint}";
const MODEL = "${params.model}";
const SIZE = "${params.size}";
const WATERMARK = ${params.watermark};
const SEQUENTIAL = "${params.sequential_image_generation}";
const RESPONSE_FORMAT = "${params.response_format}";

const OUTPUT_DIR = path.resolve(process.cwd(), 'seedream_output');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 2. 批量提示词任务列表
const PROMPTS = ${promptsJson};

// 辅助延时函数 (毫秒)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function generateSingleImage(prompt, index) {
  const taskNo = index + 1;
  const total = PROMPTS.length;
  console.log(\`[Task \${taskNo}/\${total}] 正在调用 Seedream 生成: \${prompt.slice(0, 35)}...\`);

  const payload = {
    model: MODEL,
    prompt: prompt,
    sequential_image_generation: SEQUENTIAL,
    response_format: RESPONSE_FORMAT,
    size: SIZE,
    stream: false,
    watermark: WATERMARK,
  };

  const startTime = Date.now();
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: \`Bearer \${ARK_API_KEY}\`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(\`HTTP \${response.status} \${response.statusText} - \${errText}\`);
    }

    const data = await response.json();
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    if (data.data && data.data.length > 0) {
      const item = data.data[0];
      const filename = path.join(
        OUTPUT_DIR,
        \`seedream_\${String(taskNo).padStart(3, '0')}.jpg\`
      );

      if (item.url) {
        console.log(\` -> 渲染成功(\${duration}s)，正在下载图片流...\`);
        const imgRes = await fetch(item.url);
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        fs.writeFileSync(filename, buffer);
        console.log(\` -> 已保存图片至: \${filename}\`);
      } else if (item.b64_json) {
        console.log(\` -> 渲染成功(\${duration}s)，正在解码 Base64 数据...\`);
        const buffer = Buffer.from(item.b64_json, 'base64');
        fs.writeFileSync(filename, buffer);
        console.log(\` -> 已保存图片至: \${filename}\`);
      }
    } else {
      console.warn(' -> 响应未包含有效图像数据:', data);
    }
  } catch (err) {
    console.error(\` -> 任务 \${taskNo} 执行失败:\`, err.message);
  }
}

async function main() {
  if (!ARK_API_KEY || ARK_API_KEY === 'YOUR_ARK_API_KEY') {
    console.warn('⚠️ 警告: 未配置 ARK_API_KEY，请在环境变量设置 export ARK_API_KEY="..."');
  }

  console.log(\`=== 开始批量执行豆包 Seedream 生图任务，共 \${PROMPTS.length} 项 ===\`);
  for (let i = 0; i < PROMPTS.length; i++) {
    await generateSingleImage(PROMPTS[i], i);
    // 间隔冷却以防超出并发限制
    if (i < PROMPTS.length - 1) {
      await sleep(1000);
    }
  }
  console.log('=== 全部批量生图任务处理完毕！===');
}

main();
`;
}

