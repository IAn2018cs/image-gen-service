#!/usr/bin/env python3
"""
内网图片生成服务调用脚本
服务地址: http://localhost:3100

用法:
  生图: python call_image_service.py --mode generate --model flux --prompt "..." --output-dir ./generated_images
  改图: python call_image_service.py --mode edit --model flux --prompt "..." --images /path/to/img.jpg --output-dir .
"""
import argparse
import base64
import json
import mimetypes
import os
import subprocess
import sys
import time
import urllib.request
import urllib.error

SERVICE_URL = os.environ.get("IMAGE_SERVICE_URL", "http://localhost:3100")


def copy_to_clipboard(image_path: str) -> bool:
    """将图片复制到系统剪贴板，返回是否成功。"""
    ext = image_path.lower().rsplit('.', 1)[-1]
    try:
        if sys.platform == "darwin":
            # macOS: 用 AppleScript 按类型写入剪贴板
            osa_type = "JPEG picture" if ext in ("jpg", "jpeg") else "«class PNGf»"
            script = f'set the clipboard to (read (POSIX file "{image_path}") as {osa_type})'
            subprocess.run(["osascript", "-e", script], check=True, capture_output=True)
            return True
        elif sys.platform.startswith("linux"):
            mime = "image/jpeg" if ext in ("jpg", "jpeg") else "image/png"
            with open(image_path, "rb") as f:
                data = f.read()
            # 依次尝试 xclip / wl-copy
            for cmd in (
                ["xclip", "-selection", "clipboard", "-t", mime],
                ["wl-copy", "--type", mime],
            ):
                try:
                    subprocess.run(cmd, input=data, check=True, capture_output=True)
                    return True
                except (FileNotFoundError, subprocess.CalledProcessError):
                    continue
        # Windows / 其他平台：暂不支持
        return False
    except Exception:
        return False


def load_image_as_data_uri(path_or_url: str) -> str:
    """将本地路径或 http URL 转换为 data URI。"""
    if path_or_url.startswith("data:"):
        return path_or_url

    if path_or_url.startswith("http://") or path_or_url.startswith("https://"):
        # 下载并转换
        req = urllib.request.Request(path_or_url, headers={"User-Agent": "image-gen-skill/1.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()
        content_type = resp.headers.get("Content-Type", "image/jpeg").split(";")[0].strip()
        b64 = base64.b64encode(data).decode()
        return f"data:{content_type};base64,{b64}"

    # 本地文件
    if not os.path.isfile(path_or_url):
        print(f"错误: 找不到文件 {path_or_url}", file=sys.stderr)
        sys.exit(1)
    mime, _ = mimetypes.guess_type(path_or_url)
    mime = mime or "image/jpeg"
    with open(path_or_url, "rb") as f:
        data = f.read()
    b64 = base64.b64encode(data).decode()
    return f"data:{mime};base64,{b64}"


def download_image(url: str, output_path: str) -> str:
    """从 URL 下载图片保存到本地，返回保存路径。"""
    req = urllib.request.Request(url, headers={"User-Agent": "image-gen-skill/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = resp.read()
    with open(output_path, "wb") as f:
        f.write(data)
    return output_path


def call_api(endpoint: str, payload: dict) -> dict:
    """发送 POST 请求到服务，返回解析后的 JSON。"""
    url = f"{SERVICE_URL}{endpoint}"
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        print(f"HTTP 错误 {e.code}: {err_body}", file=sys.stderr)
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"连接失败: {e.reason}\n请确认内网服务 {SERVICE_URL} 可达", file=sys.stderr)
        sys.exit(1)


def determine_extension(model: str, output_format: str | None) -> str:
    """根据模型和格式决定文件后缀。"""
    if output_format:
        fmt = output_format.lower()
        return "jpg" if fmt == "jpeg" else fmt
    # 各模型默认格式
    jpeg_models = {"seedream", "seedream45"}
    if model in jpeg_models:
        return "jpg"
    return "png"


def main():
    parser = argparse.ArgumentParser(description="内网图片生成服务调用工具")
    parser.add_argument("--mode", choices=["generate", "edit"], required=True,
                        help="操作类型: generate（生图）或 edit（改图）")
    parser.add_argument("--model", required=True,
                        help="模型 ID，如 flux / nano-banana / seedream / hunyuan 等")
    parser.add_argument("--prompt", required=True, help="文字提示词")
    parser.add_argument("--output-dir", default="./generated_images",
                        help="图片保存目录（默认: ./generated_images）")
    parser.add_argument("--images", action="append", default=[],
                        metavar="IMAGE",
                        help="参考图路径或 URL（可多次指定，改图时使用）")
    parser.add_argument("--extra", default=None,
                        help='额外参数，JSON 格式，如 \'{"aspect_ratio":"16:9","n":2}\'')
    args = parser.parse_args()

    # 解析额外参数
    extra_params = {}
    if args.extra:
        try:
            extra_params = json.loads(args.extra)
        except json.JSONDecodeError as e:
            print(f"--extra 参数 JSON 格式错误: {e}", file=sys.stderr)
            sys.exit(1)

    # 确保输出目录存在
    os.makedirs(args.output_dir, exist_ok=True)

    # 构造请求体
    payload = {"model": args.model, "prompt": args.prompt, **extra_params}
    endpoint = "/v1/images/generations"

    if args.mode == "edit":
        endpoint = "/v1/images/edits"
        if not args.images:
            print("错误: 改图模式需要通过 --images 指定至少一张参考图", file=sys.stderr)
            sys.exit(1)
        # 加载参考图为 data URI
        print(f"正在加载 {len(args.images)} 张参考图...")
        payload["images"] = [load_image_as_data_uri(img) for img in args.images]

    # 调用 API
    model_display = args.model
    mode_display = "生图" if args.mode == "generate" else "改图"
    print(f"[{mode_display}] 模型={model_display}，正在请求服务...")
    start_time = time.time()

    result = call_api(endpoint, payload)

    elapsed = time.time() - start_time
    print(f"请求完成，耗时 {elapsed:.1f}s")

    # 处理返回的图片
    data_items = result.get("data", [])
    if not data_items:
        print("错误: 服务返回的 data 为空", file=sys.stderr)
        print("完整响应:", json.dumps(result, ensure_ascii=False, indent=2), file=sys.stderr)
        sys.exit(1)

    ext = determine_extension(args.model, extra_params.get("output_format"))
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    saved_paths = []
    source_urls = []

    for idx, item in enumerate(data_items):
        suffix = f"_{idx + 1}" if len(data_items) > 1 else ""
        filename = f"{args.model}_{timestamp}{suffix}.{ext}"
        output_path = os.path.join(args.output_dir, filename)

        if "url" in item:
            # 记录服务返回的原始 URL
            source_urls.append(item["url"])
            # 下载图片
            print(f"正在下载图片 {idx + 1}/{len(data_items)}...")
            download_image(item["url"], output_path)
        elif "b64_json" in item:
            # 直接解码 base64（无原始 URL）
            img_data = base64.b64decode(item["b64_json"])
            with open(output_path, "wb") as f:
                f.write(img_data)
        else:
            print(f"警告: 第 {idx + 1} 张图片数据格式未知，跳过", file=sys.stderr)
            continue

        saved_paths.append(output_path)
        print(f"✓ 已保存: {output_path}")

    # 输出结果摘要
    print("\n" + "=" * 50)
    print(f"生成成功！共 {len(saved_paths)} 张图片：")
    for p in saved_paths:
        abs_path = os.path.abspath(p)
        print(f"  {abs_path}")
    if source_urls:
        print("下载链接：")
        for u in source_urls:
            print(f"  {u}")
    print("=" * 50)

    # 复制到剪贴板（仅复制第一张）
    clipboard_copied = False
    if saved_paths:
        clipboard_copied = copy_to_clipboard(os.path.abspath(saved_paths[0]))
        if clipboard_copied:
            suffix = f"（共 {len(saved_paths)} 张，已复制第 1 张）" if len(saved_paths) > 1 else ""
            print(f"📋 已复制到剪贴板{suffix}")
        else:
            print("⚠️  剪贴板复制不支持（当前系统或缺少依赖）")

    # 输出机器可读的 JSON 结果（供 Claude 解析）
    result_json = {
        "success": True,
        "model": args.model,
        "mode": args.mode,
        "elapsed_seconds": round(elapsed, 1),
        "saved_paths": [os.path.abspath(p) for p in saved_paths],
        "source_urls": source_urls,
    }
    print("\n__RESULT_JSON__")
    print(json.dumps(result_json, ensure_ascii=False))


if __name__ == "__main__":
    main()
