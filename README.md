# 豆包 Seedream AI 图像生成工作台 (Doubao Seedream Studio)

[![Deploy to GitHub Pages](https://github.com/shalom-lab/seedream/actions/workflows/deploy.yml/badge.svg)](https://github.com/shalom-lab/seedream/actions/workflows/deploy.yml)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

一个为火山引擎**豆包 Seedream 大模型**（如 `doubao-seedream-5-0-260128`、`doubao-seedream-4-0`）量身打造的高效、专业、纯粹的 AI 生图工作台。

采用 **BYOK（Bring Your Own Key）** 自主密钥架构，纯前端直连与自适应代理，默认采用清新自然的中文浅色界面设计，兼顾单图精细化参数调优与高产出的批量自动化处理。

---

## 🌟 核心功能特性

### 1. 🔑 BYOK 自主密钥与安全隐私
- **密钥本地隔离**：用户在界面填入的 `ARK_API_KEY` 仅保存在当前浏览器的 LocalStorage 中，直接与火山引擎方舟接口通信，绝不经过第三方服务器。
- **支持 LocalStorage 提前预读**：可直接在控制台执行 `localStorage.setItem('ARK_API_KEY', '你的密钥')` 实现无感预填与自动同步。
- **自定义端点与 CORS 解决**：支持官方北京节点、CORS 跨域代理中转节点或自定义反代网关，并提供一键连通性检测。

### 2. 🎛️ 多维参数精调中心
- **模型支持**：内置 `doubao-seedream-5.0-lite`（Seedream 5.0 Lite 最新稳定版推荐）、`doubao-seedream-5-0-260128`（快照版本）、`doubao-seedream-4.0-lite`，并支持自定义方舟接入点 ID（如 `ep-2025...`）。
- **分辨率与画幅 (Size)**：快捷切换 `2K`、`1K`、`1024x1024` (1:1)、`1280x720` (16:9)、`720x1280` (9:16)、`2048x1024` (2:1)。
- **高级生成控制**：
  - 连续生图开关（`sequential_image_generation`: `disabled` / `enabled`）
  - 响应格式（`response_format`: `b64_json` 推荐永久存入 IndexedDB 永不过期 / `url` 临时在线链接）
  - 水印开关（`watermark`: `true` / `false`）
  - 负向提示词过滤（Negative Prompt，一键填入规避肢体畸变与粗糙画质通用词）

- **风格预设与快捷词库**：分类涵盖电影科幻、3D OC 渲染光追、赛博朋克、东方水墨丹青、大师人像摄影、二次元插画、极简静物等，点击快捷追加融合。快捷键支持 `Ctrl + Enter` 即时渲染。

### 3. ⚡ 批量生成与模版矩阵调度
- **多行提示词列表队列**：每行一条提示词，自动解析排队并按序执行，带有冷却延时控制避免并发受限。
- **变量模版替换（笛卡尔积展开）**：
  - 在提示词中书写占位符，例如：`星际穿越，{主体}冲出黑洞，抢视觉冲击力，{光影}，超现实主义`
  - 可视化配置变量候选词矩阵（如 3 种主体 × 3 种光影 = 9 个任务），一键展开为执行队列。
- **执行控制器**：支持启动、停止、重试失败任务，包含实时进度条与耗时统计。

### 4. 📜 多语言自动化脚本一键导出
实时将当前工作台配置的参数与任务列表转换为开箱即用的离线脚本，无需浏览器即可在服务器运行：
- **Node.js 自动化脚本 (ESM)**：基于 Node.js 18+ 原生 `fetch` 与 `Buffer`，自动流式下载或 Base64 解码保存图片。
- **Python 自动化脚本**：包含完整 `requests` 异常捕获、流式保存与请求冷却。
- **Shell cURL 命令行**：一键生成单条 cURL 或 Shell 循环批处理命令。

### 5. 🗄️ 浏览器原生 IndexedDB 持久化与 ZIP 导出
- **突破容量限制**：采用原生 IndexedDB 存储生成的图片（Base64 或远程 URL）、完整 Prompt、Seed、尺寸、耗时与模型参数，页面刷新不丢失。
- **全屏灯箱详情**：支持大图无损缩放、提示词复制、完整 JSON 查看与**一键将历史参数回填至编辑器**再创作。
- **批量 ZIP 打包下载**：基于 JSZip 实现多选图片一键打包导出为 `.zip` 归档包，内含图片文件、`manifest.json` 元数据与 `prompts.txt` 清册。

---

## 🚀 快速上手与本地运行

### 前置要求
- [Node.js](https://nodejs.org/) (推荐 18.0 或更高版本)
- 火山引擎方舟平台 API Key（可在火山方舟控制台「API Key 管理」中创建获取）

### 安装与启动

```bash
# 1. 克隆代码仓库
git clone https://github.com/shalom-lab/seedream.git
cd seedream

# 2. 安装依赖项
npm install

# 3. 启动本地开发服务器
npm run dev
```

本地服务启动后，在浏览器访问 `http://localhost:3000` 即可开始使用。

### 生产构建

```bash
# 执行 TypeScript 类型检查与 Vite 打包
npm run build

# 本地预览生产构建产物
npm run preview
```

---

## 💰 火山引擎豆包 Seedream 官方计费价格表

工作台已原生集成火山引擎方舟官方文生图标准单价体系，支持实时单图估算、批量任务预算矩阵以及本地全作品总账单汇总统计：

| 模型名称 (Model ID) | 官方定位 | 单价 (元/张) | 计费模式 | 特性推荐 |
| :--- | :--- | :---: | :---: | :--- |
| **`doubao-seedream-5.0-lite`** | 5.0 Lite 核心推荐版 | **¥0.22** | 按张后付费 | **官方推荐** · 极致画质与极速响应的最佳平衡 |
| **`doubao-seedream-5-0-260128`** | 5.0 稳定快照版本 | **¥0.22** | 按张后付费 | 适用于对版本输出一致性要求严格的场景 |
| **`doubao-seedream-5.0-pro`** | 5.0 Pro 旗舰画质版 | **¥0.30** | 按张后付费 | 极致细节、超精细微距与商业海报级渲染 |
| **`doubao-seedream-4.0-lite`** | 4.0 经典轻量版 | **¥0.18** | 按张后付费 | 轻量经济，适合海量提示词快速概念验证 |

> 📌 **计费规则说明**：
> - 火山方舟仅对**实际调用成功生成的图片张数**进行计费，生成失败不计费；
> - 工作台不设任何平台中间层加价，用户完全使用自己的 API Key 与官方按原价直接结算；
> - 在单图创作视口、批量生成队列状态、历史作品相册及导出的 `manifest.json` 中均有清晰明细。

---

## 🌐 GitHub Pages 自动化部署 (CI/CD)

本项目已配置免维护的 GitHub Actions 持续集成与部署工作流 (`.github/workflows/deploy.yml`)：

1. 打开 GitHub 仓库页面：`https://github.com/shalom-lab/seedream`
2. 点击仓库的 **Settings**（设置）> **Pages**；
3. 在 **Build and deployment** > **Source** 下拉框中，选择 **「GitHub Actions」**；
4. 当有新代码推送到 `main` 分支时，工作流会自动触发编译并发布至：
   ```
   https://shalom-lab.github.io/seedream/
   ```

### 常见部署报错与排查：`Dependencies lock file is not found`

若在 GitHub Actions 运行 `actions/setup-node@v4` 时遇到如下报错：
```text
Error: Dependencies lock file is not found in /home/runner/work/seedream/seedream.
Supported file patterns: package-lock.json,npm-shrinkwrap.json,yarn.lock
```

**原因分析**：GitHub CI 在执行依赖缓存检测时，发现仓库中未提交 `package-lock.json`（或 `.gitignore` 忽略了 lock 文件）。

**一键解决方案**：
1. **方案 A（推荐，提交 lock 文件）**：在本地终端执行并推送到 GitHub：
   ```bash
   git add package.json package-lock.json .github/workflows/deploy.yml
   git commit -m "fix: commit package-lock.json and update deploy workflow"
   git push
   ```
2. **方案 B（使用已优化的工作流）**：本项目最新的 `.github/workflows/deploy.yml` 已经自动优化：去除了对 lock 文件的硬编码强制缓存拦截，并支持自动容错：无论是否有 lock 文件，均可自动执行 `npm install --legacy-peer-deps` 保证 100% 部署成功。

## 💡 LocalStorage 预读配置方法

如果您希望在打开页面前或脚本自动化中预先注入 API Key，可在浏览器控制台（F12 -> Console）中直接执行：

```javascript
// 写入 API Key (推荐标准键名)
localStorage.setItem('ARK_API_KEY', '你的火山引擎ARK密钥');

// (可选) 写入自定义反代或 CORS 代理端点
localStorage.setItem('ARK_ENDPOINT_URL', 'https://ark.cn-beijing.volces.com/api/v3/images/generations');
```

> 工作台内置了 `window.addEventListener('storage')` 动态监听机制，写入后页面即刻生效，无需刷新。

---

## 🛠️ 技术栈

- **框架与构建**：[React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/)
- **样式方案**：[Tailwind CSS v4](https://tailwindcss.com/)
- **存储方案**：浏览器原生 [IndexedDB API](https://developer.mozilla.org/zh-CN/docs/Web/API/IndexedDB_API)
- **打包归档**：[JSZip](https://stuk.github.io/jszip/)
- **图标与动效**：[Lucide React](https://lucide.dev/) + [Motion](https://motion.dev/)

---

## 📄 开源许可

本项目遵循 [Apache License 2.0](LICENSE) 开源协议。
