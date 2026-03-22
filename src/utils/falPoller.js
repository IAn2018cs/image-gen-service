const axios = require('axios');
const logger = require('./logger');

/**
 * Submit a job to FAL queue API and poll until completion
 * @param {Object} options
 * @param {string} options.url - FAL queue endpoint URL
 * @param {Object} options.payload - Request payload
 * @param {string} options.apiKey - FAL API key
 * @param {string} options.modelPath - Model path for status/result URLs (e.g. "flux-pro")
 * @param {number} [options.pollInterval=2000] - Poll interval in ms
 * @param {number} [options.pollTimeout=180000] - Poll timeout in ms
 * @returns {Promise<Object>} - Final result JSON
 */
async function falSubmitAndPoll({
  url,
  payload,
  apiKey,
  modelPath,
  pollInterval = 2000,
  pollTimeout = 180000,
}) {
  const headers = {
    Authorization: `Key ${apiKey}`,
    'Content-Type': 'application/json',
  };

  // Submit job
  const submitResponse = await axios.post(url, payload, {
    headers,
    timeout: 120000,
  });

  const requestId = submitResponse.data.request_id;
  if (!requestId) {
    throw new Error('FAL did not return request_id');
  }

  logger.info(`[FAL] Job submitted: ${requestId} to ${modelPath}`);

  // Poll for completion
  const statusUrl = `https://queue.fal.run/fal-ai/${modelPath}/requests/${requestId}/status`;
  const resultUrl = `https://queue.fal.run/fal-ai/${modelPath}/requests/${requestId}`;

  let totalTime = 0;
  while (totalTime < pollTimeout) {
    const statusResponse = await axios.get(statusUrl, { headers });

    if (statusResponse.data.status === 'COMPLETED') {
      const resultResponse = await axios.get(resultUrl, { headers });
      logger.info(`[FAL] Job completed: ${requestId}`);
      return resultResponse.data;
    }

    if (statusResponse.data.status === 'FAILED') {
      throw new Error(`FAL job failed: ${statusResponse.data.error || 'Unknown error'}`);
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
    totalTime += pollInterval;
  }

  throw new Error(`FAL job ${requestId} timeout after ${pollTimeout / 1000}s`);
}

/**
 * Submit a direct (synchronous) request to FAL API
 * @param {Object} options
 * @param {string} options.url - FAL direct endpoint URL
 * @param {Object} options.payload - Request payload
 * @param {string} options.apiKey - FAL API key
 * @param {number} [options.timeout=180000] - Request timeout in ms
 * @returns {Promise<Object>} - Response data
 */
async function falDirectRequest({ url, payload, apiKey, timeout = 180000 }) {
  const headers = {
    Authorization: `Key ${apiKey}`,
    'Content-Type': 'application/json',
  };

  const response = await axios.post(url, payload, { headers, timeout });
  return response.data;
}

module.exports = { falSubmitAndPoll, falDirectRequest };
