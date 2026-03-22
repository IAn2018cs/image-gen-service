const fs = require('fs');
const path = require('path');
const BaseStorage = require('./BaseStorage');
const logger = require('../logger');

/**
 * Storage implementation that writes to a locally mounted directory.
 * Suitable for NAS volumes mounted via Docker (SMB/CIFS/NFS).
 */
class LocalMountStorage extends BaseStorage {
  /**
   * @param {Object} options
   * @param {string} options.mountPath - Local mount path (e.g. "/mnt/nas/images")
   * @param {string} options.urlPrefix - URL prefix for file access (e.g. "http://192.168.1.100:8080/images")
   */
  constructor({ mountPath, urlPrefix }) {
    super();
    this.mountPath = mountPath;
    this.urlPrefix = urlPrefix.replace(/\/+$/, ''); // strip trailing slashes
  }

  /**
   * Get date-based subdirectory path (YYYY/MM/DD)
   * @returns {string}
   */
  _getDatePath() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}/${m}/${d}`;
  }

  async save(buffer, filename, mimeType) {
    const datePath = this._getDatePath();
    const dirPath = path.join(this.mountPath, datePath);

    // Ensure directory exists
    await fs.promises.mkdir(dirPath, { recursive: true });

    const filePath = path.join(dirPath, filename);
    await fs.promises.writeFile(filePath, buffer);

    const relativePath = `${datePath}/${filename}`;
    const url = `${this.urlPrefix}/${relativePath}`;

    logger.info(`[Storage] Saved: ${filePath} -> ${url}`);
    return url;
  }

  async delete(filename) {
    const filePath = path.join(this.mountPath, filename);
    try {
      await fs.promises.unlink(filePath);
      logger.info(`[Storage] Deleted: ${filePath}`);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
  }

  getUrl(filename) {
    return `${this.urlPrefix}/${filename}`;
  }
}

module.exports = LocalMountStorage;
