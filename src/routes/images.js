const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { getProvider, listModels } = require('../providers');
const { getStorage } = require('../utils/storage');
const { parseImageInput, formatToExt } = require('../utils/imageUtils');
const logger = require('../utils/logger');

const router = express.Router();

// Multer config: memory storage for multipart uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB per file
});

/**
 * Save generated images to storage and return URLs
 * @param {Array<{buffer: Buffer, mimeType: string}>} images
 * @param {string} outputFormat
 * @returns {Promise<Array<{url: string}>>}
 */
async function saveAndReturnUrls(images, outputFormat) {
  const storage = getStorage();
  const results = [];

  for (const img of images) {
    const ext = formatToExt(outputFormat || img.mimeType.split('/')[1]);
    const filename = `${uuidv4()}.${ext}`;
    const url = await storage.save(img.buffer, filename, img.mimeType);
    results.push({ url });
  }

  return results;
}

// ==================== POST /v1/images/generations ====================
router.post('/images/generations', async (req, res) => {
  try {
    const { model, ...params } = req.body;

    if (!model) {
      return res.status(400).json({
        error: { code: 'missing_model', message: 'model is required' },
      });
    }
    if (!params.prompt) {
      return res.status(400).json({
        error: { code: 'missing_prompt', message: 'prompt is required' },
      });
    }

    const provider = getProvider(model);

    if (!provider.supportsGeneration) {
      return res.status(400).json({
        error: {
          code: 'unsupported_operation',
          message: `Model ${model} does not support generation`,
        },
      });
    }

    logger.info(`[Gen] model=${model} prompt="${params.prompt.substring(0, 80)}..."`);

    const images = await provider.generate(params);
    const data = await saveAndReturnUrls(images, params.output_format);

    res.json({
      created: Math.floor(Date.now() / 1000),
      model,
      data,
    });
  } catch (err) {
    logger.error(`[Gen] Error: ${err.message}`, { stack: err.stack });
    res.status(err.status || 500).json({
      error: {
        code: err.code || 'generation_error',
        message: err.message,
      },
    });
  }
});

// ==================== POST /v1/images/edits ====================
// Supports both JSON body and multipart/form-data
router.post('/images/edits', upload.array('image[]', 16), async (req, res) => {
  try {
    let model, prompt, rawImages, otherParams;

    const isMultipart = req.is('multipart/form-data');

    if (isMultipart) {
      // Multipart: params from form fields, images from files
      model = req.body.model;
      prompt = req.body.prompt;
      otherParams = { ...req.body };
      delete otherParams.model;
      delete otherParams.prompt;

      // Parse numeric fields
      if (otherParams.n) {
        otherParams.n = parseInt(otherParams.n, 10);
      }
      if (otherParams.guidance_scale) {
        otherParams.guidance_scale = parseFloat(otherParams.guidance_scale);
      }
      if (otherParams.num_inference_steps) {
        otherParams.num_inference_steps = parseInt(otherParams.num_inference_steps, 10);
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          error: { code: 'missing_images', message: 'No image files uploaded' },
        });
      }

      rawImages = req.files.map((f) => ({
        buffer: f.buffer,
        mimeType: f.mimetype,
      }));
    } else {
      // JSON body
      const body = req.body;
      model = body.model;
      prompt = body.prompt;
      const { images: bodyImages, ...rest } = body;
      delete rest.model;
      delete rest.prompt;
      otherParams = rest;

      if (!bodyImages || !bodyImages.length) {
        return res.status(400).json({
          error: { code: 'missing_images', message: 'images array is required' },
        });
      }

      // Parse image inputs (data URIs, URLs)
      rawImages = [];
      for (const imgInput of bodyImages) {
        const parsed = await parseImageInput(imgInput);
        rawImages.push(parsed);
      }
    }

    if (!model) {
      return res.status(400).json({
        error: { code: 'missing_model', message: 'model is required' },
      });
    }
    if (!prompt) {
      return res.status(400).json({
        error: { code: 'missing_prompt', message: 'prompt is required' },
      });
    }

    const provider = getProvider(model);

    if (!provider.supportsEditing) {
      return res.status(400).json({
        error: {
          code: 'unsupported_operation',
          message: `Model ${model} does not support editing`,
        },
      });
    }

    logger.info(`[Edit] model=${model} prompt="${prompt.substring(0, 80)}..." images=${rawImages.length}`);

    const results = await provider.edit({
      prompt,
      images: rawImages,
      ...otherParams,
    });

    const data = await saveAndReturnUrls(results, otherParams.output_format);

    res.json({
      created: Math.floor(Date.now() / 1000),
      model,
      data,
    });
  } catch (err) {
    logger.error(`[Edit] Error: ${err.message}`, { stack: err.stack });
    res.status(err.status || 500).json({
      error: {
        code: err.code || 'edit_error',
        message: err.message,
      },
    });
  }
});

// ==================== GET /v1/models ====================
router.get('/models', (req, res) => {
  res.json({ data: listModels() });
});

module.exports = router;
