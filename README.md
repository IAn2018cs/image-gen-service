# Image Service

统一图片生成与编辑 API 服务，支持 13 种 AI 生图模型，通过 `model` 参数自动路由到对应上游引擎。

## 支持的模型

| 模型 | 生图 | 编辑 | 上游平台 |
|---|:---:|:---:|---|
| `flux` | Y | Y | FAL (Flux Kontext Max) |
| `flux-2-pro` | Y | Y | FAL (Flux 2 Pro) |
| `gemini` | Y | Y | Google Gemini 2.5 Flash |
| `gemini3` | Y | Y | Google Gemini 3 Pro |
| `gemini31flash` | Y | Y | Google Gemini 3.1 Flash |
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
# 编辑 .env，填入需要的 API Key 和 NAS 配置
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
    { "url": "http://nas-host:port/images/2026/03/06/uuid.png" }
  ]
}
```

### 图片编辑 (JSON)

```bash
curl -X POST http://localhost:3100/v1/images/edits \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini",
    "prompt": "add a hat to the cat",
    "images": ["data:image/png;base64,..."]
  }'
```

### 图片编辑 (文件上传)

```bash
curl -X POST http://localhost:3100/v1/images/edits \
  -F "model=gemini" \
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
请求 → Express 路由 → Provider (调用上游API) → Storage (保存到NAS) → 返回 URL
```

- **Provider 模式**: 策略模式，每个模型独立 Provider，继承 BaseProvider
- **存储模式**: 接口模式，当前实现为 LocalMountStorage (Docker 挂载 NAS)，可扩展 S3/OSS 等
- **NAS 挂载**: Docker volume CIFS 挂载，应用只需写入本地路径

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
        ├── LocalMountStorage.js # 本地挂载实现
        └── index.js             # 存储工厂
```
