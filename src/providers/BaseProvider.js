/**
 * Abstract base class for image generation providers.
 * Each provider implements generate() and/or edit() methods.
 */
class BaseProvider {
  constructor({ name, supportsGeneration = true, supportsEditing = true }) {
    this.name = name;
    this.supportsGeneration = supportsGeneration;
    this.supportsEditing = supportsEditing;
  }

  /**
   * Generate image(s) from text prompt
   * @param {Object} params
   * @param {string} params.prompt - Text prompt
   * @param {string} [params.size] - Image size
   * @param {string} [params.aspect_ratio] - Aspect ratio
   * @param {number} [params.n] - Number of images
   * @param {string} [params.output_format] - Output format (png/jpeg/webp)
   * @param {Object} [params.extra] - Provider-specific extra params
   * @returns {Promise<Array<{buffer: Buffer, mimeType: string}>>}
   */
  async generate(params) {
    throw new Error(`${this.name}: generate() not implemented`);
  }

  /**
   * Edit image(s) based on text prompt and reference images
   * @param {Object} params
   * @param {string} params.prompt - Text prompt
   * @param {Array<{buffer: Buffer, mimeType: string}>} params.images - Input images
   * @param {string} [params.size] - Image size
   * @param {string} [params.aspect_ratio] - Aspect ratio
   * @param {number} [params.n] - Number of images
   * @param {string} [params.output_format] - Output format
   * @param {Object} [params.extra] - Provider-specific extra params
   * @returns {Promise<Array<{buffer: Buffer, mimeType: string}>>}
   */
  async edit(params) {
    throw new Error(`${this.name}: edit() not implemented`);
  }
}

module.exports = BaseProvider;
