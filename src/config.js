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
  imageBaseUrl: process.env.IMAGE_BASE_URL || 'http://localhost:3100',

  // MCP server (disabled when not set)
  mcpPort: process.env.MCP_PORT ? parseInt(process.env.MCP_PORT, 10) : null,
};

module.exports = config;
