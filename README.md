# Image Service

统一图片生成与编辑 API 服务，支持 13 种 AI 生图模型，通过 `model` 参数自动路由到对应上游引擎。

## 支持的模型

| 模型 | 生图 | 编辑 | 上游平台 |
|---|:---:|:---:|---|
| `flux` | Y | Y | FAL (Flux Kontext Max) |
| `flux-2-pro` | Y | Y | FAL (Flux 2 Pro) |
| `nano-banana` | Y | Y | Google Gemini 2.5 Flash |
| `nano-banana-pro` | Y | Y | Google Gemini 3 Pro |
| `nano-banana-2` | Y | Y | Google Gemini 3.1 Flash |
| `seedream` | Y | Y | 火山引擎 (Seedream 4.0) |
| `seedream45` | Y | Y | 火山引擎 (Seedream 4.5) |
| `hunyuan` | Y | - | FAL (Hunyuan-Image-3) |
| `openai` | Y | Y | OpenAI (GPT-Image-1) |
| `openai-mini` | Y | Y | OpenAI (GPT-Image-1-Mini) |
| `openai-15` | Y | Y | OpenAI (GPT-Image-1.5) |
| `qwen` | Y | Y | FAL (Qwen Image 2512) |
| `dreamomni2` | - | Y | FAL (DreamOmni2) |

## 快速开始

### 1. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，填入需要的 API Key
```

### 2. Docker 部署

```bash
docker compose up -d --build
```

### 3. 本地开发

```bash
npm install
npm run dev    # 带热重载
```

## AI 编码助手技能集成

服务启动后，可将 `image-gen` 技能安装到 AI 编码助手中，之后直接用自然语言指令生图改图。

### 安装技能

将 `skills/image-gen` 目录复制到对应工具的技能目录：

```bash
# Claude Code
cp -r skills/image-gen ~/.claude/skills/

# Codex
cp -r skills/image-gen ~/.codex/skills/

# Gemini CLI
cp -r skills/image-gen ~/.gemini/skills/

# Antigravity
cp -r skills/image-gen ~/.gemini/antigravity/skills/
```

### 使用示例

安装后，在 AI 助手的对话中直接用自然语言触发：

```
帮我生成一张赛博朋克风格的城市夜景
```

```
用 seedream45 画一张水墨山水画，云雾缭绕
```

```
把 /tmp/photo.jpg 改成油画风格
```

技能会自动调用本地服务（`http://localhost:3100`），将图片保存到当前项目目录，并展示可点击的图片链接。

## API 接口

### 健康检查

```bash
curl http://localhost:3100/health
```

### 文生图

```bash
curl -X POST http://localhost:3100/v1/images/generations \
  -H "Content-Type: application/json" \
  -d '{
    "model": "flux",
    "prompt": "a cute cat wearing a hat",
    "n": 1,
    "size": "1024x1024",
    "output_format": "png"
  }'
```

**响应:**
```json
{
  "created": 1709712000,
  "model": "flux",
  "data": [
    { "url": "http://localhost:3100/images/2026/03/06/uuid.png" }
  ]
}
```

### 图片编辑 (JSON)

```bash
curl -X POST http://localhost:3100/v1/images/edits \
  -H "Content-Type: application/json" \
  -d '{
    "model": "nano-banana",
    "prompt": "add a hat to the cat",
    "images": ["data:image/png;base64,..."]
  }'
```

### 图片编辑 (文件上传)

```bash
curl -X POST http://localhost:3100/v1/images/edits \
  -F "model=nano-banana" \
  -F "prompt=add a hat to the cat" \
  -F "image[]=@cat.png"
```

### 模型列表

```bash
curl http://localhost:3100/v1/models
```

## 可选参数

不同模型支持不同的可选参数，不相关的参数会被自动忽略:

| 参数 | 说明 | 适用模型 |
|---|---|---|
| `n` | 生成数量 | Flux, Flux2Pro, Hunyuan, OpenAI |
| `size` | 图片尺寸 (像素) | Flux, OpenAI, Seedream |
| `aspect_ratio` | 宽高比 | Flux, Gemini |
| `image_size` | 尺寸枚举/分辨率 | Flux2Pro, Hunyuan, Qwen, Gemini3/31 |
| `output_format` | 输出格式 (png/jpeg/webp) | 大部分模型 |
| `quality` | 质量 | OpenAI |
| `background` | 背景 | OpenAI |
| `negative_prompt` | 负面提示词 | Hunyuan |
| `guidance_scale` | 引导比例 | Hunyuan |
| `num_inference_steps` | 推理步数 | Hunyuan |
| `seed` | 随机种子 | Hunyuan |

## 架构

```
请求 → Express 路由 → Provider (调用上游API) → Storage (保存到本地) → 返回 URL
```

- **Provider 模式**: 策略模式，每个模型独立 Provider，继承 BaseProvider
- **存储模式**: 接口模式，当前实现为 LocalFileStorage，图片保存到 `./data/images/`，由 Express 内置文件服务通过 `/images/*` 路径访问，可扩展 S3/OSS 等

## 环境变量

参见 [.env.example](.env.example) 获取完整的环境变量列表和说明。

## 项目结构

```
src/
├── index.js           # Express 入口
├── config.js          # 环境变量配置
├── routes/
│   └── images.js      # API 路由
├── providers/
│   ├── BaseProvider.js    # Provider 抽象基类
│   ├── index.js           # Provider 注册表
│   ├── FluxProvider.js
│   ├── Flux2ProProvider.js
│   ├── GeminiProvider.js
│   ├── Gemini3Provider.js
│   ├── Gemini31FlashProvider.js
│   ├── SeedreamProvider.js
│   ├── Seedream45Provider.js
│   ├── HunyuanProvider.js
│   ├── OpenAIProvider.js  # 含 OpenAI/Mini/1.5 三个 Provider
│   ├── QwenProvider.js
│   └── DreamOmni2Provider.js
└── utils/
    ├── logger.js          # Winston 日志
    ├── imageUtils.js      # 图片工具函数
    ├── falPoller.js       # FAL 平台通信
    └── storage/
        ├── BaseStorage.js       # 存储接口
        ├── LocalFileStorage.js  # 本地文件存储实现
        └── index.js             # 存储工厂
```
