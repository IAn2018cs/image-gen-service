import { FastMCP, imageContent } from 'fastmcp';
import { z } from 'zod';
import axios from 'axios';

/**
 * Start an MCP server (HTTP/SSE transport) that wraps the image generation API.
 * @param {number} port  MCP server port (e.g. 3101)
 * @param {string} apiBaseUrl  Internal API base URL, e.g. http://localhost:3100/v1
 */
export function startMcpServer(port, apiBaseUrl) {
  const mcp = new FastMCP({
    name: 'image-gen-service',
    version: '1.0.0',
  });

  // ─── list_models ─────────────────────────────────────────────────────────
  mcp.addTool({
    name: 'list_models',
    description: 'List all available image generation/editing models and their capabilities.',
    execute: async () => {
      const res = await axios.get(`${apiBaseUrl}/models`);
      return JSON.stringify(res.data.data, null, 2);
    },
  });

  // ─── generate_image ───────────────────────────────────────────────────────
  mcp.addTool({
    name: 'generate_image',
    description: `Generate image(s) from a text prompt using one of 13 models.

Available models (quality high → low):
  nano-banana-pro, nano-banana-2 (default), nano-banana
  openai-15, openai, openai-mini
  seedream45, seedream
  qwen, flux, flux-2-pro, hunyuan

Notes:
- hunyuan and openai-mini do NOT support editing (generation only)
- dreamomni2 is editing-only`,
    parameters: z.object({
      model: z.string().describe(
        'Model ID, e.g. "nano-banana-2", "flux", "openai", "hunyuan"'
      ),
      prompt: z.string().describe('Text description of the image to generate'),
      n: z.number().int().min(1).max(10).optional().describe(
        'Number of images (default 1)'
      ),
      aspect_ratio: z.string().optional().describe(
        'Aspect ratio, e.g. "16:9", "1:1", "4:3", "9:16"'
      ),
      size: z.string().optional().describe(
        'Image size: "1024x1024", "2K", "4K" (seedream); "1024x1024" etc (openai)'
      ),
      image_size: z.string().optional().describe(
        'Image size enum (hunyuan): square_hd, square, portrait_4_3, portrait_16_9, landscape_4_3, landscape_16_9'
      ),
      quality: z.string().optional().describe(
        'Quality (openai): auto, low, medium, high'
      ),
      output_format: z.string().optional().describe(
        'Output format: png, jpeg, webp'
      ),
      background: z.string().optional().describe(
        'Background (openai): auto, transparent, opaque'
      ),
      negative_prompt: z.string().optional().describe(
        'Negative prompt — what to avoid (hunyuan only)'
      ),
      num_inference_steps: z.number().int().optional().describe(
        'Inference steps (hunyuan, default 28)'
      ),
      guidance_scale: z.number().optional().describe(
        'Guidance strength (hunyuan, default 7.5)'
      ),
      seed: z.number().int().optional().describe(
        'Fixed seed for reproducible results'
      ),
    }),
    execute: async (args) => {
      const res = await axios.post(`${apiBaseUrl}/images/generations`, args);
      const urls = res.data.data.map((d) => d.url);
      const contents = await Promise.all(urls.map((url) => imageContent({ url })));
      if (contents.length === 1) return contents[0];
      return { content: contents };
    },
  });

  // ─── edit_image ───────────────────────────────────────────────────────────
  mcp.addTool({
    name: 'edit_image',
    description: `Edit or transform image(s) using a text prompt.

Supported models: nano-banana-pro, nano-banana-2, nano-banana, openai-15, openai, seedream45, seedream, qwen, flux, flux-2-pro, dreamomni2.

Special cases:
- dreamomni2: requires EXACTLY 2 images, performs style fusion
- hunyuan / openai-mini: do NOT support editing`,
    parameters: z.object({
      model: z.string().describe(
        'Model ID, e.g. "flux", "nano-banana-2", "openai", "dreamomni2"'
      ),
      prompt: z.string().describe('Text description of the desired edit'),
      images: z.array(z.string()).min(1).describe(
        'Array of image URLs or base64 data URIs (dreamomni2 requires exactly 2)'
      ),
      n: z.number().int().min(1).max(10).optional().describe(
        'Number of output images (default 1)'
      ),
      aspect_ratio: z.string().optional().describe(
        'Output aspect ratio, e.g. "16:9"'
      ),
      size: z.string().optional().describe('Output size, e.g. "1024x1024"'),
      output_format: z.string().optional().describe('Output format: png, jpeg'),
      guidance_scale: z.number().optional().describe('Guidance scale'),
      num_inference_steps: z.number().int().optional().describe('Inference steps'),
    }),
    execute: async (args) => {
      const res = await axios.post(`${apiBaseUrl}/images/edits`, args);
      const urls = res.data.data.map((d) => d.url);
      const contents = await Promise.all(urls.map((url) => imageContent({ url })));
      if (contents.length === 1) return contents[0];
      return { content: contents };
    },
  });

  mcp.start({
    transportType: 'httpStream',
    httpStream: { port, host: '0.0.0.0' },
  });

  return mcp;
}
