const BaseProvider = require('./BaseProvider');
const config = require('../config');
const { falSubmitAndPoll } = require('../utils/falPoller');
const { downloadToBuffer, sizeToRatio, replaceUnwantedChars, bufferToDataUri } = require('../utils/imageUtils');
const logger = require('../utils/logger');

class FluxProvider extends BaseProvider {
  constructor() {
    super({ name: 'flux', supportsGeneration: true, supportsEditing: true });
  }

  async generate({ prompt, n = 1, size, aspect_ratio, output_format = 'png' }) {
    const payload = {
      prompt: replaceUnwantedChars(prompt),
      num_images: Math.min(Math.max(1, n), 10),
      safety_tolerance: 6,
      output_format,
    };

    const ratio = aspect_ratio || sizeToRatio(size);
    if (ratio) {
      payload.aspect_ratio = ratio;
    }

    const result = await falSubmitAndPoll({
      url: 'https://queue.fal.run/fal-ai/flux-pro/kontext/max/text-to-image',
      payload,
      apiKey: config.falKey,
      modelPath: 'flux-pro',
    });

    const images = result.images || [];
    if (!images.length) {
      throw new Error('No images returned from Flux API');
    }

    const results = [];
    for (const img of images) {
      const buffer = await downloadToBuffer(img.url);
      results.push({ buffer, mimeType: `image/${output_format}` });
    }
    return results;
  }

  async edit({ prompt, images, n = 1, size, aspect_ratio, output_format = 'png' }) {
    // Convert input images to data URIs
    const imageUrls = images.map((img) => bufferToDataUri(img.buffer, img.mimeType));

    const payload = {
      prompt: replaceUnwantedChars(prompt),
      image_urls: imageUrls,
      num_images: Math.min(Math.max(1, n), 10),
      safety_tolerance: 6,
      output_format,
    };

    const ratio = aspect_ratio || sizeToRatio(size);
    if (ratio) {
      payload.aspect_ratio = ratio;
    }

    const result = await falSubmitAndPoll({
      url: 'https://queue.fal.run/fal-ai/flux-pro/kontext/max/multi',
      payload,
      apiKey: config.falKey,
      modelPath: 'flux-pro',
    });

    const resultImages = result.images || [];
    if (!resultImages.length) {
      throw new Error('No images returned from Flux API');
    }

    const results = [];
    for (const img of resultImages) {
      const buffer = await downloadToBuffer(img.url);
      results.push({ buffer, mimeType: `image/${output_format}` });
    }
    return results;
  }
}

module.exports = FluxProvider;
