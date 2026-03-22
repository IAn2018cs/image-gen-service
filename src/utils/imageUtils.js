const axios = require('axios');
const logger = require('./logger');

/**
 * Download image from URL and return as Buffer
 * @param {string} url - Image URL
 * @returns {Promise<Buffer>}
 */
async function downloadToBuffer(url) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 60000,
  });
  return Buffer.from(response.data);
}

/**
 * Convert URL to base64 string
 * @param {string} url - Image URL
 * @returns {Promise<string>}
 */
async function urlToBase64(url) {
  const buffer = await downloadToBuffer(url);
  return buffer.toString('base64');
}

/**
 * Convert Buffer to data URI
 * @param {Buffer} buffer
 * @param {string} mimeType
 * @returns {string}
 */
function bufferToDataUri(buffer, mimeType) {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

/**
 * Convert pixel dimensions string to aspect ratio
 * @param {string} size - e.g. "1024x1024", "auto"
 * @returns {string|null}
 */
function sizeToRatio(size) {
  if (!size || size === 'auto') {
    return null;
  }

  const sizeMap = {
    '1024x1024': '1:1',
    '1536x1024': '3:2',
    '1024x1536': '2:3',
  };

  if (sizeMap[size]) {
    return sizeMap[size];
  }

  const match = size.match(/^(\d+)x(\d+)$/);
  if (!match) {
    return null;
  }

  const w = parseInt(match[1]);
  const h = parseInt(match[2]);
  const r = w / h;

  const ratios = [
    { value: 21 / 9, ratio: '21:9' },
    { value: 16 / 9, ratio: '16:9' },
    { value: 4 / 3, ratio: '4:3' },
    { value: 3 / 2, ratio: '3:2' },
    { value: 1, ratio: '1:1' },
    { value: 2 / 3, ratio: '2:3' },
    { value: 3 / 4, ratio: '3:4' },
    { value: 9 / 16, ratio: '9:16' },
    { value: 9 / 21, ratio: '9:21' },
  ];

  const closest = ratios.reduce((prev, curr) =>
    Math.abs(r - curr.value) < Math.abs(r - prev.value) ? curr : prev,
  );

  return closest.ratio;
}

/**
 * Convert size to Seedream format
 * @param {string} size
 * @returns {string}
 */
function convertSizeToSeedreamFormat(size) {
  if (!size || size === 'auto') {
    return '2K';
  }
  if (['1K', '2K', '4K'].includes(size)) {
    return size;
  }
  const match = size.match(/^(\d+)x(\d+)$/);
  if (match) {
    return size;
  }
  return '2K';
}

/**
 * Map image size for Hunyuan
 * @param {string} imageSize
 * @returns {string}
 */
function mapHunyuanImageSize(imageSize) {
  const sizeMap = {
    square_hd: 'square_hd',
    square: 'square',
    portrait_4_3: 'portrait_4_3',
    portrait_16_9: 'portrait_16_9',
    landscape_4_3: 'landscape_4_3',
    landscape_16_9: 'landscape_16_9',
  };
  return sizeMap[imageSize] || 'square_hd';
}

/**
 * Strip newlines and quotes from prompt
 * @param {string} str
 * @returns {string}
 */
function replaceUnwantedChars(str) {
  return str
    .replace(/\r\n|\r|\n/g, ' ')
    .replace(/"/g, '')
    .trim();
}

/**
 * Parse an image input (data URI, URL, or Buffer) into a Buffer
 * @param {string|Buffer} image
 * @returns {Promise<{buffer: Buffer, mimeType: string}>}
 */
async function parseImageInput(image) {
  if (Buffer.isBuffer(image)) {
    return { buffer: image, mimeType: 'image/png' };
  }

  if (typeof image === 'string') {
    // data URI
    const dataUriMatch = image.match(/^data:([^;]+);base64,(.+)$/);
    if (dataUriMatch) {
      return {
        buffer: Buffer.from(dataUriMatch[2], 'base64'),
        mimeType: dataUriMatch[1],
      };
    }

    // URL
    if (image.startsWith('http://') || image.startsWith('https://')) {
      const buffer = await downloadToBuffer(image);
      return { buffer, mimeType: 'image/jpeg' };
    }
  }

  throw new Error('Invalid image input: must be a data URI, URL, or Buffer');
}

/**
 * Determine file extension from output_format or mimeType
 * @param {string} format - e.g. "png", "jpeg", "webp"
 * @returns {string}
 */
function formatToExt(format) {
  const map = { png: 'png', jpeg: 'jpg', jpg: 'jpg', webp: 'webp' };
  return map[format] || 'png';
}

module.exports = {
  downloadToBuffer,
  urlToBase64,
  bufferToDataUri,
  sizeToRatio,
  convertSizeToSeedreamFormat,
  mapHunyuanImageSize,
  replaceUnwantedChars,
  parseImageInput,
  formatToExt,
};
