const axios = require('axios');
const OpenAI = require('openai');
const FormData = require('form-data');
const BaseProvider = require('./BaseProvider');
const config = require('../config');
const { replaceUnwantedChars } = require('../utils/imageUtils');
const logger = require('../utils/logger');

/**
 * Base class for OpenAI image providers (shared logic for gpt-image-1, mini, 1.5)
 */
class OpenAIBaseProvider extends BaseProvider {
  constructor({ name, modelName }) {
    super({ name, supportsGeneration: true, supportsEditing: true });
    this.modelName = modelName;
  }

  _getClient() {
    return new OpenAI({
      apiKey: config.openaiApiKey,
      baseURL: config.openaiBaseUrl,
    });
  }

  async generate({
    prompt,
    n = 1,
    size = 'auto',
    quality = 'auto',
    output_format = 'png',
    background = 'auto',
  }) {
    const client = this._getClient();

    const params = {
      model: this.modelName,
      prompt: replaceUnwantedChars(prompt),
      n: Math.min(Math.max(1, n), 10),
      size,
      quality,
      output_format,
      background,
    };

    const response = await client.images.generate(params);

    if (!response.data?.length) {
      throw new Error(`No images returned from OpenAI ${this.modelName}`);
    }

    return response.data.map((item) => ({
      buffer: Buffer.from(item.b64_json, 'base64'),
      mimeType: `image/${output_format}`,
    }));
  }

  async edit({ prompt, images, n = 1, size = 'auto', quality = 'auto' }) {
    const baseUrl = config.openaiBaseUrl.replace(/\/+$/, '');
    const url = `${baseUrl}/images/edits`;

    const form = new FormData();
    form.append('model', this.modelName);
    form.append('prompt', replaceUnwantedChars(prompt));
    form.append('quality', quality);
    form.append('size', size);

    for (const img of images) {
      form.append('image[]', img.buffer, {
        filename: 'image.png',
        contentType: img.mimeType,
      });
    }

    const response = await axios.post(url, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${config.openaiApiKey}`,
      },
      timeout: 600000,
    });

    if (!response.data?.data?.length) {
      throw new Error(`No images returned from OpenAI ${this.modelName} edit`);
    }

    return response.data.data.map((item) => ({
      buffer: Buffer.from(item.b64_json, 'base64'),
      mimeType: 'image/png',
    }));
  }
}

class OpenAIProvider extends OpenAIBaseProvider {
  constructor() {
    super({ name: 'openai', modelName: 'gpt-image-1' });
  }
}

class OpenAIMiniProvider extends OpenAIBaseProvider {
  constructor() {
    super({ name: 'openai-mini', modelName: 'gpt-image-1-mini' });
  }
}

class OpenAI15Provider extends OpenAIBaseProvider {
  constructor() {
    super({ name: 'openai-15', modelName: 'gpt-image-1.5' });
  }
}

module.exports = { OpenAIProvider, OpenAIMiniProvider, OpenAI15Provider };
