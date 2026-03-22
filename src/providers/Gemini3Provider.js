const axios = require('axios');
const BaseProvider = require('./BaseProvider');
const config = require('../config');
const { replaceUnwantedChars } = require('../utils/imageUtils');
const logger = require('../utils/logger');

class Gemini3Provider extends BaseProvider {
  constructor() {
    super({ name: 'gemini3', supportsGeneration: true, supportsEditing: true });
  }

  async _callAPI({ prompt, images = [], aspectRatio, imageSize }) {
    const url = `${config.geminiBaseUrl}/v1beta/models/gemini-3-pro-image-preview:generateContent`;

    const parts = [{ text: replaceUnwantedChars(prompt) }];

    for (const img of images) {
      parts.push({
        inline_data: {
          mime_type: 'image/jpeg',
          data: img.buffer.toString('base64'),
        },
      });
    }

    const generationConfig = {
      responseModalities: ['TEXT', 'IMAGE'],
    };

    if (aspectRatio || imageSize) {
      generationConfig.imageConfig = {};
      if (aspectRatio) {
        generationConfig.imageConfig.aspectRatio = aspectRatio;
      }
      if (imageSize) {
        generationConfig.imageConfig.imageSize = imageSize;
      }
    }

    const payload = {
      contents: [{ parts }],
      generationConfig,
    };

    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': config.geminiApiKey,
      },
      timeout: 600000,
    });

    const candidates = response.data?.candidates;
    if (!candidates?.length) {
      throw new Error('No candidates returned from Gemini 3 API');
    }

    const content = candidates[0]?.content;
    if (!content?.parts) {
      throw new Error('No content parts in Gemini 3 response');
    }

    const imagePart = content.parts.find((p) => p.inlineData?.data);
    if (!imagePart) {
      throw new Error('No image data in Gemini 3 response');
    }

    const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
    return [{ buffer, mimeType: 'image/png' }];
  }

  async generate({ prompt, aspect_ratio, image_size }) {
    return this._callAPI({ prompt, aspectRatio: aspect_ratio, imageSize: image_size });
  }

  async edit({ prompt, images, aspect_ratio, image_size }) {
    return this._callAPI({ prompt, images, aspectRatio: aspect_ratio, imageSize: image_size });
  }
}

module.exports = Gemini3Provider;
