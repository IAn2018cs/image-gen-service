const fs = require('fs');
const path = require('path');
const BaseStorage = require('./BaseStorage');
const logger = require('../logger');

/**
 * Storage implementation that writes to a local directory served by Express.
 * Files are accessible at urlPrefix/YYYY/MM/DD/filename.
 */
class LocalFileStorage extends BaseStorage {
  /**
   * @param {Object} options
   * @param {string} options.storagePath - Absolute directory path (e.g. "/data/images")
   * @param {string} options.urlPrefix  - Public URL prefix  (e.g. "http://localhost:3100/images")
   */
  constructor({ storagePath, urlPrefix }) {
    super();
    this.storagePath = storagePath;
    this.urlPrefix = urlPrefix.replace(/\/+$/, '');
  }

  _getDatePath() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}/${m}/${d}`;
  }

  async save(buffer, filename, mimeType) {
    const datePath = this._getDatePath();
    const dirPath = path.join(this.storagePath, datePath);

    await fs.promises.mkdir(dirPath, { recursive: true });

    const filePath = path.join(dirPath, filename);
    await fs.promises.writeFile(filePath, buffer);

    const url = `${this.urlPrefix}/${datePath}/${filename}`;
    logger.info(`[Storage] Saved: ${filePath} -> ${url}`);
    return url;
  }

  async delete(filename) {
    const filePath = path.join(this.storagePath, filename);
    try {
      await fs.promises.unlink(filePath);
      logger.info(`[Storage] Deleted: ${filePath}`);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }

  getUrl(filename) {
    return `${this.urlPrefix}/${filename}`;
  }
}

module.exports = LocalFileStorage;
