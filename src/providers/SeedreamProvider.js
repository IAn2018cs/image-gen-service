const axios = require('axios');
const BaseProvider = require('./BaseProvider');
const config = require('../config');
const { replaceUnwantedChars, convertSizeToSeedreamFormat, bufferToDataUri } = require('../utils/imageUtils');
const logger = require('../utils/logger');

class SeedreamProvider extends BaseProvider {
  constructor() {
    super({ name: 'seedream', supportsGeneration: true, supportsEditing: true });
  }

  async _callAPI({ prompt, images = [], size }) {
    const url = `${config.arkBaseUrl}/api/v3/images/generations`;

    const payload = {
      model: 'doubao-seedream-4-0-250828',
      prompt: replaceUnwantedChars(prompt),
      size: convertSizeToSeedreamFormat(size),
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
      throw new Error('No data returned from Seedream API');
    }

    const imageData = data[0];
    if (imageData.error) {
      throw new Error(`Seedream API error: ${imageData.error.message}`);
    }
    if (!imageData.b64_json) {
      throw new Error('No image data in Seedream response');
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

module.exports = SeedreamProvider;
