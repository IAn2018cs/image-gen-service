const BaseProvider = require('./BaseProvider');
const config = require('../config');
const { falDirectRequest } = require('../utils/falPoller');
const { downloadToBuffer, replaceUnwantedChars, bufferToDataUri } = require('../utils/imageUtils');

class QwenProvider extends BaseProvider {
  constructor() {
    super({ name: 'qwen', supportsGeneration: true, supportsEditing: true });
  }

  async generate({ prompt, image_size, n = 1, output_format = 'png' }) {
    const payload = {
      prompt: replaceUnwantedChars(prompt),
      num_inference_steps: 28,
      guidance_scale: 4,
      enable_safety_checker: false,
      output_format,
      num_images: Math.min(Math.max(1, n), 1),
      acceleration: 'regular',
    };

    if (image_size) {
      payload.image_size = image_size;
    }

    const result = await falDirectRequest({
      url: 'https://fal.run/fal-ai/qwen-image-2512',
      payload,
      apiKey: config.falKey,
    });

    const images = result.images || [];
    if (!images.length) {
      throw new Error('No images returned from Qwen API');
    }

    const results = [];
    for (const img of images) {
      const buffer = await downloadToBuffer(img.url);
      results.push({ buffer, mimeType: `image/${output_format}` });
    }
    return results;
  }

  async edit({ prompt, images, image_size, n = 1, output_format = 'png' }) {
    const imageUrls = images.map((img) => bufferToDataUri(img.buffer, img.mimeType));

    const payload = {
      prompt: replaceUnwantedChars(prompt),
      image_urls: imageUrls,
      num_inference_steps: 28,
      guidance_scale: 4.5,
      enable_safety_checker: false,
      output_format,
      num_images: Math.min(Math.max(1, n), 1),
      acceleration: 'regular',
    };

    if (image_size) {
      payload.image_size = image_size;
    }

    const result = await falDirectRequest({
      url: 'https://fal.run/fal-ai/qwen-image-edit-2511',
      payload,
      apiKey: config.falKey,
    });

    const resultImages = result.images || [];
    if (!resultImages.length) {
      throw new Error('No images returned from Qwen Edit API');
    }

    const results = [];
    for (const img of resultImages) {
      const buffer = await downloadToBuffer(img.url);
      results.push({ buffer, mimeType: `image/${output_format}` });
    }
    return results;
  }
}

module.exports = QwenProvider;
