# PROJECT_MAP — 工程地图

> 本文档是 image-service 的详细架构参考，供 Claude Code 和开发者快速定位逻辑。
> CLAUDE.md 中有精简索引指向此处。

---

## 1. 核心请求流程

```
Client Request
     │
     ├──► REST API (port 3100)
     │         │
     │         ▼
     │      index.js          Express 入口，挂载 /v1 路由 + /health
     │         │
     │         ▼
     │      routes/images.js  路由层：解析请求 → 调 Provider → 调 Storage → 返回 URL
     │         │
     │         ├──► POST /v1/images/generations   文生图
     │         │      1. 校验 model + prompt
     │         │      2. getProvider(model).generate(params)
     │         │      3. saveAndReturnUrls(images, output_format)
     │         │      4. 返回 { created, model, data: [{ url }] }
     │         │
     │         ├──► POST /v1/images/edits         图片编辑（JSON / multipart 双模式）
     │         │      1. 检测 Content-Type
     │         │      2. JSON 模式: parseImageInput() 解析 data URI / URL
     │         │         multipart 模式: multer 解析 image[] 文件
     │         │      3. getProvider(model).edit({ prompt, images, ...params })
     │         │      4. saveAndReturnUrls → 返回 URL
     │         │
     │         └──► GET /v1/models               列出所有模型及能力
     │
     └──► MCP Server (port 3101, 需 MCP_PORT 环境变量)
               │
               ▼
            src/mcp.mjs       fastmcp httpStream 服务（ESM 模块）
               │
               ├──► tool: generate_image   → 内调 POST /v1/images/generations
               ├──► tool: edit_image       → 内调 POST /v1/images/edits
               └──► tool: list_models      → 内调 GET /v1/models
```

### 数据流: Provider 输出 → Storage

```
Provider.generate/edit()
  └─► 返回 Array<{ buffer: Buffer, mimeType: string }>

saveAndReturnUrls(images, outputFormat)
  ├─ formatToExt(outputFormat) → 文件扩展名
  ├─ uuid() → 文件名
  └─ storage.save(buffer, filename, mimeType) → URL
```

---

## 2. 目录结构

```
image-service/
├── package.json                 # 依赖: express, axios, sharp, openai, uuid, winston, dotenv, form-data, multer, fastmcp, zod
├── Dockerfile                   # node:20-alpine + sharp 原生依赖
├── docker-compose.yml           # 单服务 + 本地路径挂载 (./data/images)，映射 3100+3101
├── .env.example                 # 环境变量模板
├── .dockerignore
├── src/
│   ├── index.js                 # Express 入口 (body limit 50mb, 请求日志, 全局错误)；MCP_PORT 有值时 dynamic import mcp.mjs
│   ├── config.js                # 环境变量集中加载 (dotenv)，含 mcpPort
│   ├── mcp.mjs                  # MCP 服务入口 (ESM)：fastmcp httpStream，3 个 tool，绑定 0.0.0.0
│   ├── routes/
│   │   └── images.js            # 路由层 (generations/edits/models)
│   ├── providers/
│   │   ├── BaseProvider.js      # 抽象基类 { name, supportsGeneration, supportsEditing, generate(), edit() }
│   │   ├── FluxProvider.js      # FAL 队列 (flux-pro kontext max)
│   │   ├── Flux2ProProvider.js  # FAL 同步 (flux-2-pro)
│   │   ├── GeminiProvider.js    # Gemini 2.5 Flash (key=query param, modalities=["IMAGE"])
│   │   ├── Gemini3Provider.js   # Gemini 3 Pro (x-goog-api-key header, modalities=["TEXT","IMAGE"])
│   │   ├── Gemini31FlashProvider.js  # Gemini 3.1 Flash (同 Gemini3 认证, 支持 imageSize)
│   │   ├── SeedreamProvider.js  # 火山 ARK (doubao-seedream-4-0-250828)
│   │   ├── Seedream45Provider.js # 火山 ARK (doubao-seedream-4-5-251128, 增强尺寸校验)
│   │   ├── HunyuanProvider.js   # FAL 队列 (hunyuan-image, 仅生图)
│   │   ├── OpenAIProvider.js    # OpenAI SDK + FormData (gpt-image-1 / mini / 1.5, 三合一)
│   │   ├── QwenProvider.js      # FAL 同步 (qwen-image-2512 / qwen-image-edit-2511)
│   │   ├── DreamOmni2Provider.js # FAL 队列 (仅编辑, 需恰好2张图, sharp 对齐尺寸)
│   │   └── index.js             # Provider 注册表: model name → instance 映射
│   └── utils/
│       ├── logger.js            # winston 日志 (timestamp + level + message)
│       ├── imageUtils.js        # 图片工具函数集合
│       ├── falPoller.js         # FAL 平台通信: 队列轮询 + 同步直调
│       └── storage/
│           ├── BaseStorage.js       # 存储接口: save(buffer,filename,mime)→url
│           ├── LocalFileStorage.js  # 本地文件存储: 按日期存储, Express /images 静态访问
│           └── index.js             # 存储工厂: getStorage() 单例
```

---

## 3. Provider 一览表

| model 名称 | Provider 文件 | 生图 | 编辑 | 上游平台 | API 模式 | 认证方式 |
|---|---|:---:|:---:|---|---|---|
| `flux` | FluxProvider.js | Y | Y | FAL | 队列轮询 | `Key {FAL_KEY}` |
| `flux-2-pro` | Flux2ProProvider.js | Y | Y | FAL | 同步 | `Key {FAL_KEY}` |
| `nano-banana` | GeminiProvider.js | Y | Y | Google | 同步 | `?key=` query param |
| `nano-banana-pro` | Gemini3Provider.js | Y | Y | Google | 同步 | `x-goog-api-key` header |
| `nano-banana-2` | Gemini31FlashProvider.js | Y | Y | Google | 同步 | `x-goog-api-key` header |
| `seedream` | SeedreamProvider.js | Y | Y | 火山 ARK | 同步 | `Bearer {ARK_API_KEY}` |
| `seedream45` | Seedream45Provider.js | Y | Y | 火山 ARK | 同步 | `Bearer {ARK_API_KEY}` |
| `hunyuan` | HunyuanProvider.js | Y | N | FAL | 队列轮询 | `Key {FAL_KEY}` |
| `openai` | OpenAIProvider.js | Y | Y | OpenAI | SDK+FormData | `Bearer {OPENAI_API_KEY}` |
| `openai-mini` | OpenAIProvider.js | Y | Y | OpenAI | SDK+FormData | `Bearer {OPENAI_API_KEY}` |
| `openai-15` | OpenAIProvider.js | Y | Y | OpenAI | SDK+FormData | `Bearer {OPENAI_API_KEY}` |
| `qwen` | QwenProvider.js | Y | Y | FAL | 同步 | `Key {FAL_KEY}` |
| `dreamomni2` | DreamOmni2Provider.js | N | Y | FAL | 队列轮询 | `Key {FAL_KEY}` |

---

## 4. 关键模块详解

### 4.1 路由层 — `routes/images.js`

- **saveAndReturnUrls(images, outputFormat)**: 路由层的桥接函数，将 Provider 返回的 Buffer 数组逐个存入 Storage 并收集 URL
- **编辑接口双模式**:
  - `req.is('multipart/form-data')` 检测请求类型
  - multipart 时 multer 已解析 `req.files`，表单字段在 `req.body`
  - JSON 时 `req.body.images` 数组通过 `parseImageInput()` 解析为 `{buffer, mimeType}`
  - 两种模式最终统一为 `rawImages: Array<{buffer, mimeType}>`

### 4.2 Provider 基类 — `providers/BaseProvider.js`

```javascript
constructor({ name, supportsGeneration, supportsEditing })
async generate(params) → Array<{ buffer: Buffer, mimeType: string }>
async edit(params)     → Array<{ buffer: Buffer, mimeType: string }>
```

Provider **只负责调用上游 API 并返回图片 Buffer**，不关心存储。

### 4.3 Provider 注册表 — `providers/index.js`

- `providers` 对象: model 字符串 → Provider 实例的静态映射
- `getProvider(model)`: 查找 provider，不存在则抛 400 错误
- `listModels()`: 遍历 providers 输出 `[{ id, capabilities }]`
- **新增 Provider 时**: 在此文件 import 并添加映射即可

### 4.4 FAL 通信 — `utils/falPoller.js`

两种调用模式:
- **`falSubmitAndPoll()`**: 队列模式 — POST 提交 → 轮询 status → GET 结果
  - 用于: Flux, Hunyuan, DreamOmni2
  - 轮询参数: pollInterval=2s, pollTimeout=180s
  - status URL: `queue.fal.run/fal-ai/{modelPath}/requests/{id}/status`
  - result URL: `queue.fal.run/fal-ai/{modelPath}/requests/{id}`
- **`falDirectRequest()`**: 同步模式 — POST 直接返回结果
  - 用于: Flux2Pro, Qwen
  - URL 域名: `fal.run` (非 `queue.fal.run`)

### 4.5 图片工具 — `utils/imageUtils.js`

| 函数 | 用途 | 使用者 |
|---|---|---|
| `downloadToBuffer(url)` | URL → Buffer | Flux, Flux2Pro, Hunyuan, Qwen, DreamOmni2 |
| `urlToBase64(url)` | URL → base64 string | (备用) |
| `bufferToDataUri(buffer, mime)` | Buffer → data URI | Flux, Flux2Pro, Seedream, Qwen, DreamOmni2 (上传图片) |
| `sizeToRatio(size)` | 像素尺寸 → 宽高比枚举 | Flux |
| `convertSizeToSeedreamFormat(size)` | 尺寸 → 1K/2K/4K | Seedream |
| `mapHunyuanImageSize(size)` | 尺寸 → FAL 枚举 | Hunyuan |
| `replaceUnwantedChars(str)` | 清理 prompt 换行/引号 | 所有 Provider |
| `parseImageInput(image)` | data URI/URL/Buffer → {buffer, mimeType} | 编辑路由(JSON模式) |
| `formatToExt(format)` | 格式 → 扩展名 | saveAndReturnUrls |

### 4.6 存储层 — `utils/storage/`

```
BaseStorage (接口)
├── save(buffer, filename, mimeType) → url
├── delete(filename) → void
└── getUrl(filename) → url

LocalFileStorage (当前实现)
├── 写入路径: {LOCAL_STORAGE_PATH}/{YYYY}/{MM}/{DD}/{uuid}.{ext}
├── 返回 URL:  {IMAGE_BASE_URL}/images/{YYYY}/{MM}/{DD}/{uuid}.{ext}
└── Express 以 /images 静态路由提供访问 (src/index.js)
```

- **工厂**: `storage/index.js` 的 `getStorage()` — 单例，返回 LocalFileStorage 实例
- **扩展**: 新增存储方式时创建 `XxxStorage.js` 继承 BaseStorage，在工厂中替换或扩展实例化逻辑

---

## 5. 环境变量分组

| 分组 | 变量 | 使用者 |
|---|---|---|
| **服务** | `PORT` (3100), `LOG_LEVEL` (info) | index.js, logger.js |
| **FAL** | `FAL_KEY` | Flux, Flux2Pro, Hunyuan, Qwen, DreamOmni2 |
| **Gemini** | `GEMINI_API_KEY`, `GEMINI_BASE_URL` | Gemini, Gemini3, Gemini31Flash |
| **ARK** | `ARK_API_KEY`, `ARK_BASE_URL` | Seedream, Seedream45 |
| **OpenAI** | `OPENAI_API_KEY`, `OPENAI_BASE_URL` | OpenAI, OpenAIMini, OpenAI15 |
| **存储** | `LOCAL_STORAGE_PATH`, `IMAGE_BASE_URL` | LocalFileStorage |
| **MCP** | `MCP_PORT` (3101, 不设则不启动) | mcp.mjs |
| **Docker** | (无额外变量，使用 bind mount) | docker-compose.yml volumes |

---

## 6. 新增 Provider 检查清单

1. 创建 `src/providers/XxxProvider.js`，继承 BaseProvider
2. 实现 `generate()` 和/或 `edit()` — 返回 `Array<{buffer, mimeType}>`
3. 在 `src/providers/index.js` 中 import 并添加到 `providers` 映射
4. 如需新环境变量，在 `src/config.js` 添加配置项
5. 更新 `.env.example` 添加新变量说明
6. 更新本文档 Provider 一览表

## 7. 新增存储方式检查清单

1. 创建 `src/utils/storage/XxxStorage.js`，继承 BaseStorage
2. 实现 `save()` / `delete()` / `getUrl()` 方法
3. 在 `src/utils/storage/index.js` 中替换实例化逻辑
4. 在 `src/config.js` 添加所需配置项
5. 更新 `.env.example`

---

## 8. Provider 上游 API 端点速查

### FAL 队列类
| Provider | 提交 URL | 轮询 modelPath |
|---|---|---|
| Flux Gen | `queue.fal.run/fal-ai/flux-pro/kontext/max/text-to-image` | `flux-pro` |
| Flux Edit | `queue.fal.run/fal-ai/flux-pro/kontext/max/multi` | `flux-pro` |
| Hunyuan Gen | `queue.fal.run/fal-ai/hunyuan-image/v3/text-to-image` | `hunyuan-image` |
| DreamOmni2 Edit | `queue.fal.run/fal-ai/dreamomni2/edit` | `dreamomni2` |

### FAL 同步类
| Provider | URL |
|---|---|
| Flux2Pro Gen | `fal.run/fal-ai/flux-2-pro` |
| Flux2Pro Edit | `fal.run/fal-ai/flux-2-pro/edit` |
| Qwen Gen | `fal.run/fal-ai/qwen-image-2512` |
| Qwen Edit | `fal.run/fal-ai/qwen-image-edit-2511` |

### Gemini 类
| Provider | 模型 | 认证 |
|---|---|---|
| Gemini | `gemini-2.5-flash-image-preview` | `?key=` |
| Gemini3 | `gemini-3-pro-image-preview` | `x-goog-api-key` |
| Gemini31Flash | `gemini-3.1-flash-image-preview` | `x-goog-api-key` |

### ARK 类
| Provider | URL | 模型 |
|---|---|---|
| Seedream | `{arkBaseUrl}/api/v3/images/generations` | `doubao-seedream-4-0-250828` |
| Seedream45 | `{arkBaseUrl}/api/v3/images/generations` | `doubao-seedream-4-5-251128` |

### OpenAI 类
| Provider | 生图 | 编辑 | 模型 |
|---|---|---|---|
| OpenAI | SDK `images.generate()` | FormData POST `{baseUrl}/images/edits` | `gpt-image-1` |
| OpenAIMini | 同上 | 同上 | `gpt-image-1-mini` |
| OpenAI15 | 同上 | 同上 | `gpt-image-1.5` |

---

## 9. Docker 部署

```yaml
# docker-compose.yml 核心配置
services:
  image-service:
    build: .
    ports:
      - "${IMAGE_SERVICE_PORT:-3100}:3100"
      - "${MCP_PORT:-3101}:3101"
    env_file: .env
    environment:
      - PORT=3100
      - MCP_PORT=3101
    volumes:
      - ./data/images:${LOCAL_STORAGE_PATH:-/data/images}  # bind mount
```

- 宿主机 `./data/images` 映射到容器内 `LOCAL_STORAGE_PATH`，图片直接落盘到项目目录
- Dockerfile 基于 `node:20-alpine`，安装 sharp 原生依赖 (python3, make, g++, vips-dev)
- `npm ci --production` 仅安装生产依赖
- MCP server (`mcp.mjs`) 以 ESM 动态 import 方式在 Express 启动后启动，绑定 `0.0.0.0:3101`
