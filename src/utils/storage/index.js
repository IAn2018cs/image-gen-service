const config = require('../../config');
const LocalFileStorage = require('./LocalFileStorage');

let storageInstance = null;

/**
 * Get the storage instance based on configuration.
 * @returns {import('./BaseStorage')}
 */
function getStorage() {
  if (storageInstance) return storageInstance;

  storageInstance = new LocalFileStorage({
    storagePath: config.localStoragePath,
    urlPrefix: config.localFileUrlPrefix,
  });

  return storageInstance;
}

module.exports = { getStorage };
