const axios = require('axios');
const BaseProvider = require('./BaseProvider');
const config = require('../config');
const { replaceUnwantedChars } = require('../utils/imageUtils');
const logger = require('../utils/logger');

class GeminiProvider extends BaseProvider {
  constructor() {
    super({ name: 'nano-banana', supportsGeneration: true, supportsEditing: true });
  }

  async _callAPI({ prompt, images = [], aspectRatio }) {
    const url = `${config.geminiBaseUrl}/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${config.geminiApiKey}`;

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
      responseModalities: ['IMAGE'],
    };

    if (aspectRatio) {
      generationConfig.imageConfig = { aspectRatio };
    }

    const payload = {
      contents: [{ parts }],
      generationConfig,
    };

    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 600000,
    });

    const candidates = response.data?.candidates;
    if (!candidates?.length) {
      throw new Error('No candidates returned from Gemini API');
    }

    const content = candidates[0]?.content;
    if (!content?.parts) {
      throw new Error('No content parts in Gemini response');
    }

    const imagePart = content.parts.find((p) => p.inlineData?.data);
    if (!imagePart) {
      throw new Error('No image data in Gemini response');
    }

    const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
    return [{ buffer, mimeType: 'image/png' }];
  }

  async generate({ prompt, aspect_ratio }) {
    return this._callAPI({ prompt, aspectRatio: aspect_ratio });
  }

  async edit({ prompt, images, aspect_ratio }) {
    return this._callAPI({ prompt, images, aspectRatio: aspect_ratio });
  }
}

module.exports = GeminiProvider;
