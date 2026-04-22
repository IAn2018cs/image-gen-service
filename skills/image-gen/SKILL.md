---
name: image-gen
description: >
  使用内网图片生成服务（http://10.0.0.252:12018/）生成或编辑图片。
  当用户说"帮我生成一张图"、"画一张..."、"生图"、"文生图"、"改图"、"图片编辑"、"PS一下"、
  "用 flux/gemini/seedream/hunyuan/openai/qwen 生成"、"换个风格"、"修改图片"等时，
  必须使用此技能。支持 14 个模型，生成结果优先保存到用户当前项目目录。
  即使用户没有明确说"用这个服务"，只要涉及 AI 生图或改图，都应该主动使用此技能。
---

# 内网图片生成服务

服务地址（已内置，无需配置）：`http://10.0.0.252:12018`

## 工作流程

1. **判断操作类型**：是生图（无参考图）还是改图（有参考图）
2. **确认模型**：
   - 用户**未指定模型**时，默认使用 `gemini31flash`，直接执行，无需询问
   - 用户**主动要求换模型**时，使用 `AskUserQuestion` 工具弹出选择列表（见下方"换模型"说明）
3. **确认参数**：提示词、尺寸等
4. **执行调用**：运行 `scripts/call_image_service.py`
5. **展示结果**：
   - 告知图片已保存到本地路径
   - 若结果 JSON 中 `source_urls` 不为空，将每个 URL 作为**可点击链接**展示给用户（图片已持久保存到 NAS，链接长期有效）
   - 告知剪贴板复制状态：成功则提示"已复制到剪贴板，可直接粘贴使用"；失败则说明原因
   - 用 Read 工具展示图片预览（如果环境支持）

### 换模型时的交互方式

当用户说"换个模型"、"用其他模型生成"、"换成 xxx"等时，用 `AskUserQuestion` 弹出选择，选项按画质从强到弱排列：

```
问题：请选择要使用的模型
选项（画质从强到弱）：
  Nano Banana 系列（最强）：
    - gemini3        Nano Banana Pro，最强画质，细节丰富
    - gemini31flash  Nano Banana 2（默认），速度快，适合迭代
    - gemini         Nano Banana，擅长复杂构图、图文混排
  OpenAI 系列：
    - fal-gpt-image-2 GPT Image 2，画质强，支持 quality/mask 编辑
    - openai-15      gpt-image-1.5，最新版
    - openai         gpt-image-1，通用，写实与插画
    - openai-mini    轻量版，速度最快，仅生图
  Seedream 系列：
    - seedream45     豆包 4.5，中文提示词最佳，画质好
    - seedream       豆包 4.0
  其他：
    - qwen           通义千问，艺术风格
    - flux           Flux Pro Kontext Max，多图改图支持好
    - flux-2-pro     Flux 快速版
    - hunyuan        混元，仅生图，支持负向词、精细参数控制
    - dreamomni2     仅改图，需恰好 2 张参考图，做风格融合
```

注意：选择后直接用所选模型重新生成，不要再追问确认。

---

## 模型一览

画质排序：**Nano Banana 系列 > OpenAI 系列 > Seedream 系列 > 其他**

| 模型 ID         | 底层模型                           | 生图 | 改图 | 特点 / 适用场景 |
|----------------|------------------------------------|:----:|:----:|----------------|
| `gemini3`       | Nano Banana Pro                    | ✓    | ✓    | 画质最强，细节丰富 |
| `gemini31flash` | Nano Banana 2                      | ✓    | ✓    | **默认**，速度快，适合迭代调整 |
| `gemini`        | Nano Banana                        | ✓    | ✓    | 擅长复杂构图，图文混排 |
| `fal-gpt-image-2` | GPT Image 2                     | ✓    | ✓    | 画质强，支持 quality 和 mask 蒙版编辑 |
| `openai-15`     | gpt-image-1.5                      | ✓    | ✓    | 最新 OpenAI 版本 |
| `openai`        | gpt-image-1                        | ✓    | ✓    | 通用，擅长写实与插画 |
| `openai-mini`   | gpt-image-1-mini                   | ✓    | ✗    | 轻量版，速度最快，**不支持改图** |
| `seedream45`    | Doubao Seedream 4.5                | ✓    | ✓    | 中文提示词最佳，国风、写实 |
| `seedream`      | Doubao Seedream 4.0                | ✓    | ✓    | 中文提示词支持 |
| `qwen`          | Qwen Image 2512                    | ✓    | ✓    | 阿里出品，艺术风格 |
| `flux`          | Flux Pro Kontext Max               | ✓    | ✓    | 支持多图改图 |
| `flux-2-pro`    | Flux 2 Pro                         | ✓    | ✓    | Flux 快速版 |
| `hunyuan`       | Hunyuan Image v3                   | ✓    | ✗    | 仅生图，支持负向提示词、精细控制参数 |
| `dreamomni2`    | DreamOmni2                         | ✗    | ✓    | **仅改图**，需要恰好 2 张参考图，风格融合 |

**特殊场景推荐：**
- 中文创意生图 → `seedream45`
- 精细控制（负向词、步数）→ `hunyuan`
- 两图风格融合 → `dreamomni2`
- 蒙版局部编辑 → `fal-gpt-image-2`

---

## 各模型参数详解

### flux / flux-2-pro（Flux 系列）

**生图参数：**
```
prompt        文字提示词（必填）
n             生成数量，1-10，默认 1
output_format 输出格式，png/jpeg，默认 png（flux），jpeg（flux-2-pro）
```
- `flux` 额外支持：`size`（像素尺寸如 1024x1024）、`aspect_ratio`（如 16:9）
- `flux-2-pro` 额外支持：`image_size`（同上，或 {width, height} 对象）

**aspect_ratio 可选值（flux）：** `1:1` `3:2` `2:3` `4:3` `3:4` `16:9` `9:16` `21:9` `9:21`

**改图参数**（在生图参数基础上增加）：
```
images        参考图数组，支持本地路径、http URL、data URI
```

### Nano Banana / Nano Banana Pro / Nano Banana 2（Nano Banana 系列）

**生图参数：**
```
prompt        文字提示词（必填）
aspect_ratio  宽高比（可选）
image_size    分辨率（可选，Nano Banana Pro / Nano Banana 2 支持，默认 1K）
```

**aspect_ratio 可选值：** `1:1`(1024×1024) `2:3`(832×1248) `3:2`(1248×832) `3:4`(864×1184) `4:3`(1184×864) `4:5`(896×1152) `5:4`(1152×896) `9:16`(768×1344) `16:9`(1344×768) `21:9`(1536×672)

**image_size 可选值（Nano Banana Pro / Nano Banana 2）：**

| image_size 值 | 分辨率     | 支持模型                              |
|--------------|----------|--------------------------------------|
| `1K`          | ~1024px  | gemini3、gemini31flash（**默认**）     |
| `2K`          | ~2048px  | gemini3、gemini31flash                |
| `4K`          | ~4096px  | gemini3、gemini31flash                |
| `512`         | ~512px   | **仅 gemini31flash（Nano Banana 2）** |

> **注意**：必须使用**大写 K**（如 `1K`、`2K`、`4K`），小写（如 `1k`）会被服务拒绝。`512` 无 K 后缀。

**改图参数**（在生图基础上增加）：
```
images        参考图数组（多图支持，做图片编辑/融合）
```
- 输出格式固定为 PNG

### seedream / seedream45（豆包 Seedream 系列）

**生图 & 改图参数（共用）：**
```
prompt        文字提示词（必填），支持中文，建议不超过 300 字
size          尺寸，支持以下格式：
```
| size 值      | 说明           |
|------------|----------------|
| `1K`        | 约 1024×1024（仅 seedream）|
| `2K`        | 约 2048×2048（默认）|
| `4K`        | 约 4096×4096  |
| `WxH`       | 自定义像素，如 `1664x2496`（2:3竖图）|

**改图参数**（额外增加）：
```
images        参考图数组（本地路径 / http URL / data URI）
```
- 输出格式固定为 JPEG

### hunyuan（混元，仅生图）

```
prompt              文字提示词（必填）
negative_prompt     负向提示词，描述不想要的内容（可选）
image_size          尺寸枚举：square_hd（默认）/ square / portrait_4_3 / portrait_16_9 / landscape_4_3 / landscape_16_9
n                   生成数量，1-10，默认 1
num_inference_steps 推理步数，默认 28，越高质量越好但更慢
guidance_scale      引导强度，默认 7.5，越高越贴近提示词
seed                随机种子（可选），固定种子复现结果
output_format       png（默认）/ jpeg
```
- 不支持改图

### fal-gpt-image-2（GPT Image 2）

**生图参数：**
```
prompt        文字提示词（必填）
n             生成数量，1-4，默认 1
image_size    尺寸枚举：square_hd / square / portrait_4_3 / portrait_16_9 / landscape_4_3（默认）/ landscape_16_9
quality       质量：low / medium / high（默认）
output_format png（默认）/ jpeg / webp
```

**改图参数**（在生图基础上增加）：
```
images        参考图数组（本地路径 / http URL / data URI）
mask          蒙版图片（可选），指定编辑区域
image_size    默认 auto（保持原图尺寸）
```
- 支持 mask 蒙版，可精确控制编辑区域

### openai / openai-mini / openai-15（OpenAI 系列）

**生图参数：**
```
prompt        文字提示词（必填）
n             生成数量，1-10，默认 1
size          尺寸（auto / 1024x1024 等），默认 auto
quality       质量（auto / low / medium / high），默认 auto
output_format png（默认）/ jpeg / webp
background    背景（auto / transparent / opaque），默认 auto
```

**改图参数**（在生图基础上，去掉 background/output_format，增加）：
```
images        参考图数组
```

### qwen（通义千问）

```
prompt        文字提示词（必填）
image_size    尺寸，WxH 格式（如 1024x1024）或 {width, height} 对象
n             数量，最多 1（服务器限制）
output_format png（默认）/ jpeg
```
- 改图需提供 images 参考图

### dreamomni2（仅改图）

```
prompt        文字提示词（必填）
images        参考图数组，**必须恰好 2 张**（第二张会自动对齐第一张尺寸）
output_format png（默认）
```
- 不支持生图
- 典型用途：把第一张图的内容/人物，换成第二张图的风格

---

## 执行方式

使用 Bash 工具运行以下脚本：

```bash
python3 <skill_dir>/scripts/call_image_service.py \
  --mode generate \
  --model flux \
  --prompt "一只可爱的小猫" \
  --output-dir "$(pwd)/generated_images"
```

**脚本参数：**
```
--mode        generate（生图）或 edit（改图）
--model       模型 ID（见上方表格）
--prompt      提示词
--output-dir  保存目录（默认为当前目录下的 generated_images/）
--images      改图时的参考图，可多次指定（本地路径或 http URL）
--extra       额外 JSON 参数，如 '{"n":2,"aspect_ratio":"16:9"}'
```

**图片保存规则：**
- 优先保存到用户当前工作目录（`pwd`）下的 `generated_images/` 文件夹
- 文件名格式：`{model}_{timestamp}.{ext}`（如 `flux_20240306_143022.png`）
- 若目录不存在，自动创建

---

## 典型示例

### 1. 快速生图（使用默认模型）
用户：帮我生成一张赛博朋克风格的城市夜景
```bash
python3 <skill_dir>/scripts/call_image_service.py \
  --mode generate --model flux \
  --prompt "cyberpunk city nightscape, neon lights, rain reflection, 8K, ultra detailed" \
  --output-dir "$(pwd)/generated_images"
```

### 2. 指定比例生图
用户：生成一张 16:9 的横图
```bash
--extra '{"aspect_ratio":"16:9"}'
```

### 3. 中文提示词生图（推荐 seedream）
用户：用中文提示词画一张国风山水
```bash
--model seedream45 --prompt "水墨山水画，远山叠嶂，云雾缭绕，传统中国画风格"
```

### 4. 参考图改图（flux）
用户：把这张图改成油画风格（图片路径 /tmp/photo.jpg）
```bash
--mode edit --model flux \
--prompt "transform to oil painting style, thick brush strokes, classical art" \
--images /tmp/photo.jpg
```

### 5. 两图风格融合（dreamomni2）
用户：把图A的人物换成图B的风格
```bash
--mode edit --model dreamomni2 \
--prompt "合成这两张图的风格" \
--images /tmp/content.jpg --images /tmp/style.jpg
```

### 6. 高分辨率生图（Nano Banana 4K）
用户：生成一张 4K 的赛博朋克城市
```bash
--model gemini3 \
--extra '{"image_size":"4K"}'
```
> 注意：必须大写 K，`4k` 会报错

### 7. 精细控制（hunyuan）
用户：生成一张竖版人像，不要模糊背景
```bash
--model hunyuan \
--extra '{"image_size":"portrait_4_3","negative_prompt":"blurry background, out of focus","guidance_scale":8}'
```

---

## 注意事项

- 服务在内网，确保网络可达 10.0.0.252:12018
- dreamomni2 改图**必须提供恰好 2 张图**，否则报错
- hunyuan **不支持改图**，如用户要改图请切换到 flux
- 生图完成后，告知用户图片保存路径，并尝试用 Read 工具展示图片
- 如果用户未指定模型，默认用 `flux`（生图）或 `flux`（改图）
