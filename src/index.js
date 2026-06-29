/**
 * Compress a single image file in the browser using the Canvas API.
 *
 * @param {File|Blob} file - The image file to compress.
 * @param {Object} [options]
 * @param {number} [options.maxWidth=1200] - Max output width. Height scales proportionally.
 * @param {number} [options.maxHeight] - Max output height. With maxWidth, image fits within the bounding box.
 * @param {number} [options.quality=0.8] - 0.0 to 1.0. Only affects WebP and JPEG — PNG ignores this.
 * @param {"image/webp"|"image/jpeg"|"image/png"} [options.format="image/webp"]
 * @returns {Promise<SquishResult>}
 */
export function squish(file, options = {}) {
  const {
    maxWidth = 1200,
    maxHeight,
    quality = 0.8,
    format = "image/webp",
  } = options;

  return new Promise((resolve, reject) => {
    if (!(file instanceof Blob)) {
      return reject(new TypeError("Input must be a File or Blob"));
    }

    if (quality < 0 || quality > 1) {
      return reject(new RangeError("Quality must be between 0.0 and 1.0"));
    }

    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(img.src);

      let { width, height } = img;
      const originalWidth = width;
      const originalHeight = height;

      // Never scale up — only shrink to fit within bounds
      if (maxWidth && width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      if (maxHeight && height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return reject(new Error("Failed to get canvas 2D context"));
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return reject(new Error("Compression failed — canvas.toBlob returned null"));
          }

          resolve({
            blob,
            width,
            height,
            originalWidth,
            originalHeight,
            originalSize: file.size,
            compressedSize: blob.size,
            ratio: +(blob.size / file.size).toFixed(4),
            savedPercent: +(((file.size - blob.size) / file.size) * 100).toFixed(1),
            format,
          });
        },
        format,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Failed to load image — is the file a valid image?"));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Compress multiple image files in parallel.
 * Results are returned in the same order as input.
 *
 * @param {(File|Blob)[]} files
 * @param {Object} [options] - Same options as squish().
 * @returns {Promise<SquishResult[]>}
 */
export function squishAll(files, options = {}) {
  return Promise.all(files.map((file) => squish(file, options)));
}

/**
 * Create a pre-configured squish function. Per-call options override defaults.
 *
 * @param {Object} defaults
 * @returns {(file: File|Blob, options?: Object) => Promise<SquishResult>}
 */
export function createSquisher(defaults = {}) {
  return (file, options = {}) => squish(file, { ...defaults, ...options });
}
