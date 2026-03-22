const BaseProvider = require('./BaseProvider');
const config = require('../config');
const { falDirectRequest } = require('../utils/falPoller');
const { downloadToBuffer, replaceUnwantedChars, bufferToDataUri } = require('../utils/imageUtils');

class Flux2ProProvider extends BaseProvider {
  constructor() {
    super({ name: 'flux-2-pro', supportsGeneration: true, supportsEditing: true });
  }

  async generate({ prompt, size, image_size, n = 1, output_format = 'jpeg' }) {
    const payload = {
      prompt: replaceUnwantedChars(prompt),
      num_images: Math.min(Math.max(1, n), 10),
      safety_tolerance: '5',
      enable_safety_checker: false,
      output_format,
    };

    if (image_size) {
      payload.image_size = image_size;
    }

    const result = await falDirectRequest({
      url: 'https://fal.run/fal-ai/flux-2-pro',
      payload,
      apiKey: config.falKey,
    });

    const images = result.images || [];
    if (!images.length) {
      throw new Error('No images returned from Flux 2 Pro API');
    }

    const results = [];
    for (const img of images) {
      const buffer = await downloadToBuffer(img.url);
      results.push({ buffer, mimeType: `image/${output_format}` });
    }
    return results;
  }

  async edit({ prompt, images, image_size, n = 1, output_format = 'jpeg' }) {
    const imageUrls = images.map((img) => bufferToDataUri(img.buffer, img.mimeType));

    const payload = {
      prompt: replaceUnwantedChars(prompt),
      image_urls: imageUrls,
      num_images: Math.min(Math.max(1, n), 10),
      safety_tolerance: '5',
      enable_safety_checker: false,
      output_format,
    };

    if (image_size) {
      payload.image_size = image_size;
    }

    const result = await falDirectRequest({
      url: 'https://fal.run/fal-ai/flux-2-pro/edit',
      payload,
      apiKey: config.falKey,
    });

    const resultImages = result.images || [];
    if (!resultImages.length) {
      throw new Error('No images returned from Flux 2 Pro API');
    }

    const results = [];
    for (const img of resultImages) {
      const buffer = await downloadToBuffer(img.url);
      results.push({ buffer, mimeType: `image/${output_format}` });
    }
    return results;
  }
}

module.exports = Flux2ProProvider;
