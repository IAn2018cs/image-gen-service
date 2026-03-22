const axios = require('axios');
const BaseProvider = require('./BaseProvider');
const config = require('../config');
const { replaceUnwantedChars, bufferToDataUri } = require('../utils/imageUtils');
const logger = require('../utils/logger');

/**
 * Convert size to Seedream 4.5 format with enhanced validation
 */
function convertSizeSeedream45(size) {
  if (!size || size === 'auto') {
    return '2K';
  }
  if (['2K', '4K'].includes(size)) {
    return size;
  }
  const match = size.match(/^(\d+)x(\d+)$/);
  if (match) {
    const w = parseInt(match[1]);
    const h = parseInt(match[2]);
    const totalPixels = w * h;
    const ratio = w / h;
    // Validate pixel range and aspect ratio bounds
    if (totalPixels < 3686400 || totalPixels > 16777216) {
      logger.warn(`[Seedream45] Pixel count ${totalPixels} out of range, using 2K`);
      return '2K';
    }
    if (ratio < 1 / 16 || ratio > 16) {
      logger.warn(`[Seedream45] Aspect ratio ${ratio} out of range, using 2K`);
      return '2K';
    }
    return size;
  }
  return '2K';
}

class Seedream45Provider extends BaseProvider {
  constructor() {
    super({ name: 'seedream45', supportsGeneration: true, supportsEditing: true });
  }

  async _callAPI({ prompt, images = [], size }) {
    const url = `${config.arkBaseUrl}/api/v3/images/generations`;

    const payload = {
      model: 'doubao-seedream-4-5-251128',
      prompt: replaceUnwantedChars(prompt),
      size: convertSizeSeedream45(size),
      sequential_image_generation: 'disabled',
      stream: false,
      response_format: 'b64_json',
      watermark: false,
    };

    if (images.length > 0) {
      payload.image = images.map((img) => bufferToDataUri(img.buffer, img.mimeType));
    }

    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.arkApiKey}`,
      },
      timeout: 120000,
    });

    const data = response.data?.data;
    if (!data?.length) {
      throw new Error('No data returned from Seedream 4.5 API');
    }

    const imageData = data[0];
    if (imageData.error) {
      throw new Error(`Seedream 4.5 API error: ${imageData.error.message}`);
    }
    if (!imageData.b64_json) {
      throw new Error('No image data in Seedream 4.5 response');
    }

    const buffer = Buffer.from(imageData.b64_json, 'base64');
    return [{ buffer, mimeType: 'image/jpeg' }];
  }

  async generate({ prompt, size }) {
    return this._callAPI({ prompt, size });
  }

  async edit({ prompt, images, size }) {
    return this._callAPI({ prompt, images, size });
  }
}

module.exports = Seedream45Provider;
