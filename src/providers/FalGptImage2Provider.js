const BaseProvider = require('./BaseProvider');
const config = require('../config');
const { falDirectRequest } = require('../utils/falPoller');
const { downloadToBuffer, replaceUnwantedChars, bufferToDataUri } = require('../utils/imageUtils');

class FalGptImage2Provider extends BaseProvider {
  constructor() {
    super({ name: 'fal-gpt-image-2', supportsGeneration: true, supportsEditing: true });
  }

  async generate({ prompt, image_size, quality, n = 1, output_format = 'png' }) {
    const payload = {
      prompt: replaceUnwantedChars(prompt),
      num_images: Math.min(Math.max(1, n), 4),
      output_format,
    };

    if (image_size) {
      payload.image_size = image_size;
    }
    if (quality) {
      payload.quality = quality;
    }

    const result = await falDirectRequest({
      url: 'https://fal.run/openai/gpt-image-2',
      payload,
      apiKey: config.falKey,
    });

    const images = result.images || [];
    if (!images.length) {
      throw new Error('No images returned from FAL GPT Image 2 API');
    }

    const results = [];
    for (const img of images) {
      const buffer = await downloadToBuffer(img.url);
      results.push({ buffer, mimeType: `image/${output_format}` });
    }
    return results;
  }

  async edit({ prompt, images, mask, image_size, quality, n = 1, output_format = 'png' }) {
    const imageUrls = images.map((img) => bufferToDataUri(img.buffer, img.mimeType));

    const payload = {
      prompt: replaceUnwantedChars(prompt),
      image_urls: imageUrls,
      num_images: Math.min(Math.max(1, n), 4),
      output_format,
    };

    if (image_size) {
      payload.image_size = image_size;
    }
    if (quality) {
      payload.quality = quality;
    }
    if (mask) {
      payload.mask_url = bufferToDataUri(mask.buffer, mask.mimeType);
    }

    const result = await falDirectRequest({
      url: 'https://fal.run/openai/gpt-image-2/edit',
      payload,
      apiKey: config.falKey,
    });

    const resultImages = result.images || [];
    if (!resultImages.length) {
      throw new Error('No images returned from FAL GPT Image 2 Edit API');
    }

    const results = [];
    for (const img of resultImages) {
      const buffer = await downloadToBuffer(img.url);
      results.push({ buffer, mimeType: `image/${output_format}` });
    }
    return results;
  }
}

module.exports = FalGptImage2Provider;
