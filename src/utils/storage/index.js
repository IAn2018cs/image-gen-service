const config = require('../../config');
const LocalMountStorage = require('./LocalMountStorage');

let storageInstance = null;

/**
 * Get the storage instance based on configuration
 * @returns {import('./BaseStorage')}
 */
function getStorage() {
  if (storageInstance) {
    return storageInstance;
  }

  switch (config.storageType) {
    case 'local_mount':
    default:
      storageInstance = new LocalMountStorage({
        mountPath: config.nasMountPath,
        urlPrefix: config.nasFileUrlPrefix,
      });
      break;
    // Future: case 's3': storageInstance = new S3Storage(...); break;
  }

  return storageInstance;
}

module.exports = { getStorage };
