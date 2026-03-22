require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT || '3100', 10),
  logLevel: process.env.LOG_LEVEL || 'info',

  // FAL platform
  falKey: process.env.FAL_KEY || '',

  // Gemini
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiBaseUrl: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com',

  // ARK (Seedream)
  arkApiKey: process.env.ARK_API_KEY || '',
  arkBaseUrl: process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com',

  // OpenAI
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',

  // Storage
  localStoragePath: process.env.LOCAL_STORAGE_PATH || '/data/images',
  localFileUrlPrefix: process.env.LOCAL_FILE_URL_PREFIX || 'http://localhost:3100/images',
};

module.exports = config;
