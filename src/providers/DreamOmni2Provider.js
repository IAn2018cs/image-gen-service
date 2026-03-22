const sharp = require('sharp');
const BaseProvider = require('./BaseProvider');
const config = require('../config');
const { falSubmitAndPoll } = require('../utils/falPoller');
const { downloadToBuffer, replaceUnwantedChars, bufferToDataUri } = require('../utils/imageUtils');
const logger = require('../utils/logger');

class DreamOmni2Provider extends BaseProvider {
  constructor() {
    super({ name: 'dreamomni2', supportsGeneration: false, supportsEditing: true });
  }

  async edit({ prompt, images, output_format = 'png' }) {
    if (!images || images.length !== 2) {
      throw new Error('DreamOmni2 requires exactly 2 reference images');
    }

    // Get first image dimensions to align second image
    const firstMeta = await sharp(images[0].buffer).metadata();
    const targetWidth = firstMeta.width;
    const targetHeight = firstMeta.height;

    // Resize second image to match first image dimensions
    const resizedSecond = await sharp(images[1].buffer)
      .resize(targetWidth, targetHeight, { fit: 'inside' })
      .toBuffer();

    const imageUrl1 = bufferToDataUri(images[0].buffer, images[0].mimeType);
    const imageUrl2 = bufferToDataUri(resizedSecond, images[1].mimeType);

    const payload = {
      image_url_1: imageUrl1,
      image_url_2: imageUrl2,
      prompt: replaceUnwantedChars(prompt),
      num_inference_steps: 28,
      guidance_scale: 3.5,
      output_format,
    };

    const result = await falSubmitAndPoll({
      url: 'https://queue.fal.run/fal-ai/dreamomni2/edit',
      payload,
      apiKey: config.falKey,
      modelPath: 'dreamomni2',
    });

    const image = result.image;
    if (!image || !image.url) {
      throw new Error('No image returned from DreamOmni2 API');
    }

    const buffer = await downloadToBuffer(image.url);
    return [{ buffer, mimeType: image.content_type || `image/${output_format}` }];
  }
}

module.exports = DreamOmni2Provider;
