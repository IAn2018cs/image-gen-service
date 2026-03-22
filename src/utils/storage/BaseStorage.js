/**
 * Abstract base class for file storage.
 * All storage implementations must extend this class.
 */
class BaseStorage {
  /**
   * Save image buffer to storage and return accessible URL
   * @param {Buffer} buffer - Image data
   * @param {string} filename - File name (e.g. "abc123.png")
   * @param {string} mimeType - MIME type (e.g. "image/png")
   * @returns {Promise<string>} - Accessible URL
   */
  async save(buffer, filename, mimeType) {
    throw new Error('save() not implemented');
  }

  /**
   * Delete a file from storage
   * @param {string} filename - File name or path
   * @returns {Promise<void>}
   */
  async delete(filename) {
    throw new Error('delete() not implemented');
  }

  /**
   * Get the accessible URL for a file
   * @param {string} filename - File name or path
   * @returns {string}
   */
  getUrl(filename) {
    throw new Error('getUrl() not implemented');
  }
}

module.exports = BaseStorage;
