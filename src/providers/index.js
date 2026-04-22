const FluxProvider = require('./FluxProvider');
const Flux2ProProvider = require('./Flux2ProProvider');
const GeminiProvider = require('./GeminiProvider');
const Gemini3Provider = require('./Gemini3Provider');
const Gemini31FlashProvider = require('./Gemini31FlashProvider');
const SeedreamProvider = require('./SeedreamProvider');
const Seedream45Provider = require('./Seedream45Provider');
const HunyuanProvider = require('./HunyuanProvider');
const { OpenAIProvider, OpenAIMiniProvider, OpenAI15Provider } = require('./OpenAIProvider');
const QwenProvider = require('./QwenProvider');
const DreamOmni2Provider = require('./DreamOmni2Provider');
const FalGptImage2Provider = require('./FalGptImage2Provider');
const config = require('../config');

const providers = {
  flux: new FluxProvider(),
  'flux-2-pro': new Flux2ProProvider(),
  'nano-banana': new GeminiProvider(),
  'nano-banana-pro': new Gemini3Provider(),
  'nano-banana-2': new Gemini31FlashProvider(),
  seedream: new SeedreamProvider(),
  seedream45: new Seedream45Provider(),
  hunyuan: new HunyuanProvider(),
  openai: new OpenAIProvider(),
  'openai-mini': new OpenAIMiniProvider(),
  'openai-15': new OpenAI15Provider(),
  qwen: new QwenProvider(),
  dreamomni2: new DreamOmni2Provider(),
  'fal-gpt-image-2': new FalGptImage2Provider(),
};

// Maps model id to the config key whose value must be non-empty
const providerApiKeyMap = {
  flux: 'falKey',
  'flux-2-pro': 'falKey',
  'nano-banana': 'geminiApiKey',
  'nano-banana-pro': 'geminiApiKey',
  'nano-banana-2': 'geminiApiKey',
  seedream: 'arkApiKey',
  seedream45: 'arkApiKey',
  hunyuan: 'falKey',
  openai: 'openaiApiKey',
  'openai-mini': 'openaiApiKey',
  'openai-15': 'openaiApiKey',
  qwen: 'falKey',
  dreamomni2: 'falKey',
};

/**
 * Get provider by model name
 * @param {string} model
 * @returns {import('./BaseProvider')}
 */
function getProvider(model) {
  const provider = providers[model];
  if (!provider) {
    const supported = Object.keys(providers).join(', ');
    const err = new Error(`Unknown model: ${model}. Supported models: ${supported}`);
    err.code = 'invalid_model';
    err.status = 400;
    throw err;
  }
  return provider;
}

/**
 * Get all available models with their capabilities.
 * Models whose required API key is not configured are excluded.
 * @returns {Array}
 */
function listModels() {
  return Object.entries(providers)
    .filter(([id]) => {
      const configKey = providerApiKeyMap[id];
      return !configKey || !!config[configKey];
    })
    .map(([id, provider]) => {
      const capabilities = [];
      if (provider.supportsGeneration) {
        capabilities.push('generation');
      }
      if (provider.supportsEditing) {
        capabilities.push('editing');
      }
      return { id, capabilities };
    });
}

module.exports = { getProvider, listModels };
