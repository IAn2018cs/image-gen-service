# CLAUDE.md — image-service

> 详细架构和流程图见 [PROJECT_MAP.md](PROJECT_MAP.md)

## 项目概述

统一图片生成与编辑 API 服务。根据 `model` 参数路由到 13 个上游 Provider，生成的图片保存到 NAS 并返回 URL。内网部署，无需认证。

## 工程入口

| 入口 | 路径 | 说明 |
|---|---|---|
| Express 启动 | `src/index.js` | 端口、中间件、路由挂载 |
| 配置集中 | `src/config.js` | 所有环境变量在此加载 |
| API 路由 | `src/routes/images.js` | 三个端点: generations / edits / models |
| Provider 注册 | `src/providers/index.js` | model → Provider 映射，新增模型改这里 |
| 存储工厂 | `src/utils/storage/index.js` | 存储策略切换改这里 |

## 常改入口

- **新增 Provider**: 创建 `src/providers/XxxProvider.js` → 注册到 `src/providers/index.js`
- **新增存储**: 创建 `src/utils/storage/XxxStorage.js` → 添加到 `src/utils/storage/index.js`
- **新增环境变量**: `src/config.js` + `.env.example`
- **调整 API 行为**: `src/routes/images.js`

## 核心约定

- Provider 只返回 `Array<{buffer: Buffer, mimeType: string}>`，不关心存储
- 路由层负责 Provider → Storage 的桥接 (saveAndReturnUrls)
- 编辑接口同时支持 JSON body 和 multipart/form-data
- 图片按日期存储: `{mountPath}/{YYYY}/{MM}/{DD}/{uuid}.{ext}`
- FAL 平台有两种模式: 队列轮询 (`falSubmitAndPoll`) 和同步直调 (`falDirectRequest`)，见 `src/utils/falPoller.js`

## 快速定位

```bash
# 找 Provider
grep -r "class.*Provider" src/providers/

# 找某个模型的上游 URL
grep -r "fal.run\|fal-ai\|generateContent\|api/v3" src/providers/

# 找环境变量使用
grep -r "config\." src/providers/ src/utils/storage/

# 找存储实现
ls src/utils/storage/
```

## 环境变量分组 (详见 .env.example)

- **服务**: PORT, LOG_LEVEL
- **FAL**: FAL_KEY (Flux/Flux2Pro/Hunyuan/Qwen/DreamOmni2/FalGptImage2)
- **Gemini**: GEMINI_API_KEY, GEMINI_BASE_URL
- **ARK**: ARK_API_KEY, ARK_BASE_URL (Seedream/Seedream45)
- **OpenAI**: OPENAI_API_KEY, OPENAI_BASE_URL
- **存储**: STORAGE_TYPE, NAS_MOUNT_PATH, NAS_FILE_URL_PREFIX
- **Docker NAS**: NAS_HOST, NAS_USER, NAS_PASSWORD, NAS_PORT, NAS_SHARE_PATH

## 活文档

此文件和 PROJECT_MAP.md 是活文档，每次新增/修改功能时同步更新相关段落。
