const BaseProvider = require('./BaseProvider');
const config = require('../config');
const { falSubmitAndPoll } = require('../utils/falPoller');
const { downloadToBuffer, replaceUnwantedChars, mapHunyuanImageSize } = require('../utils/imageUtils');

class HunyuanProvider extends BaseProvider {
  constructor() {
    super({ name: 'hunyuan', supportsGeneration: true, supportsEditing: false });
  }

  async generate({
    prompt,
    negative_prompt = '',
    image_size = 'square_hd',
    n = 1,
    num_inference_steps = 28,
    guidance_scale = 7.5,
    seed,
    output_format = 'png',
  }) {
    const payload = {
      prompt: replaceUnwantedChars(prompt),
      negative_prompt: negative_prompt ? replaceUnwantedChars(negative_prompt) : '',
      image_size: mapHunyuanImageSize(image_size),
      num_images: Math.min(Math.max(1, n), 10),
      num_inference_steps,
      guidance_scale,
      enable_safety_checker: false,
      output_format,
      enable_prompt_expansion: false,
    };

    if (seed !== undefined && seed !== null) {
      payload.seed = seed;
    }

    const result = await falSubmitAndPoll({
      url: 'https://queue.fal.run/fal-ai/hunyuan-image/v3/text-to-image',
      payload,
      apiKey: config.falKey,
      modelPath: 'hunyuan-image',
    });

    const images = result.images || [];
    if (!images.length) {
      throw new Error('No images returned from Hunyuan API');
    }

    const results = [];
    for (const img of images) {
      const buffer = await downloadToBuffer(img.url);
      const mimeType = img.content_type || `image/${output_format}`;
      results.push({ buffer, mimeType });
    }
    return results;
  }
}

module.exports = HunyuanProvider;
