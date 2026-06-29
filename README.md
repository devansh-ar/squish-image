# squish-image

**3-4 MB in. ~200 KB out. 95% smaller. No backend. No dependencies.**

Compress images entirely in the browser before uploading them anywhere. Uses the native Canvas API — works with any framework, any backend, any cloud provider.

```
Phone camera photo (3.5 MB JPG)
        |
   squish(file)
        |
   Compressed (180 KB WebP)  -->  Upload to S3, Cloudinary, Firebase, anywhere
```

## Why?

Most apps upload raw images and rely on server-side processing. That means:

- You store the full 3-4 MB original (costs money)
- Users wait longer on slow connections (bad UX)
- You burn through CDN bandwidth (more money)
- You need server-side image processing (complexity)

**squish-image** fixes all of this by compressing **before** the upload — in the browser, in one function call.

## Install

```bash
npm install squish-image
```

```bash
yarn add squish-image
```

```bash
pnpm add squish-image
```

## Quick Start

```js
import { squish } from "squish-image";

const input = document.querySelector('input[type="file"]');

input.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  const result = await squish(file);

  console.log(`${result.savedPercent}% smaller`);
  console.log(`${result.originalSize} bytes -> ${result.compressedSize} bytes`);

  // result.blob is a Blob — ready to upload via FormData
});
```

## API

### `squish(file, options?)`

Compress a single image. Returns a Promise with the compressed blob and metadata.

**Options:**

| Option | Type | Default | Description |
|---|---|---|---|
| `maxWidth` | `number` | `1200` | Max output width in px. Height scales to keep aspect ratio. |
| `maxHeight` | `number` | `undefined` | Max output height in px. Combined with maxWidth, image fits within the bounding box. |
| `quality` | `number` | `0.8` | Compression quality, 0.0 to 1.0. Lower = smaller file. Only affects WebP and JPEG. |
| `format` | `string` | `"image/webp"` | Output format: `"image/webp"`, `"image/jpeg"`, or `"image/png"` |

**Returns `SquishResult`:**

| Property | Type | Description |
|---|---|---|
| `blob` | `Blob` | The compressed image, ready to upload |
| `width` | `number` | Output width in px |
| `height` | `number` | Output height in px |
| `originalWidth` | `number` | Input width in px |
| `originalHeight` | `number` | Input height in px |
| `originalSize` | `number` | Input file size in bytes |
| `compressedSize` | `number` | Output file size in bytes |
| `ratio` | `number` | Compression ratio (e.g. `0.05` = 5% of original) |
| `savedPercent` | `number` | Percentage saved (e.g. `95.2`) |
| `format` | `string` | Output MIME type |

### `squishAll(files, options?)`

Compress multiple images in parallel. Same options as `squish()`. Returns `Promise<SquishResult[]>` in input order.

```js
import { squishAll } from "squish-image";

const results = await squishAll([file1, file2, file3], { quality: 0.7 });

const totalSaved = results.reduce((sum, r) => sum + r.originalSize - r.compressedSize, 0);
console.log(`Saved ${(totalSaved / 1024 / 1024).toFixed(1)} MB total`);
```

### `createSquisher(defaults?)`

Create a pre-configured compressor. Per-call options override the defaults.

```js
import { createSquisher } from "squish-image";

// Configure once for your whole app
const compress = createSquisher({
  maxWidth: 800,
  quality: 0.7,
  format: "image/jpeg",
});

// Use everywhere
const result = await compress(file);
```

## Framework Examples

### React

```jsx
import { squish } from "squish-image";

function ImageUpload() {
  const handleChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const { blob, savedPercent } = await squish(file);
    console.log(`Compressed ${savedPercent}%`);

    // Upload the blob
    const formData = new FormData();
    formData.append("image", blob, "photo.webp");
    await fetch("/api/upload", { method: "POST", body: formData });
  };

  return <input type="file" accept="image/*" onChange={handleChange} />;
}
```

### Vue

```vue
<template>
  <input type="file" accept="image/*" @change="handleChange" />
</template>

<script setup>
import { squish } from "squish-image";

async function handleChange(e) {
  const file = e.target.files[0];
  if (!file) return;

  const { blob, savedPercent } = await squish(file);
  console.log(`Compressed ${savedPercent}%`);

  const formData = new FormData();
  formData.append("image", blob, "photo.webp");
  await fetch("/api/upload", { method: "POST", body: formData });
}
</script>
```

### Svelte

```svelte
<script>
  import { squish } from "squish-image";

  async function handleChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    const { blob, savedPercent } = await squish(file);
    console.log(`Compressed ${savedPercent}%`);

    const formData = new FormData();
    formData.append("image", blob, "photo.webp");
    await fetch("/api/upload", { method: "POST", body: formData });
  }
</script>

<input type="file" accept="image/*" on:change={handleChange} />
```

### Upload to Cloudinary

```js
import { squish } from "squish-image";

async function uploadToCloudinary(file) {
  const { blob } = await squish(file);

  const formData = new FormData();
  formData.append("file", blob, "image.webp");
  formData.append("upload_preset", "your_preset");

  const res = await fetch(
    "https://api.cloudinary.com/v1_1/your_cloud_name/image/upload",
    { method: "POST", body: formData }
  );

  const data = await res.json();
  return data.secure_url;
}
```

### Upload to AWS S3 (presigned URL)

```js
import { squish } from "squish-image";

async function uploadToS3(file) {
  const { blob } = await squish(file, { format: "image/webp" });

  // Get presigned URL from your backend
  const { uploadUrl } = await fetch("/api/presign").then((r) => r.json());

  await fetch(uploadUrl, {
    method: "PUT",
    body: blob,
    headers: { "Content-Type": "image/webp" },
  });
}
```

## How It Works

Under the hood, `squish()` does 4 things:

1. **Loads the image** into a temporary `<img>` element via `URL.createObjectURL()`
2. **Calculates dimensions** — scales down to fit `maxWidth`/`maxHeight` while keeping aspect ratio (never scales up)
3. **Draws onto a `<canvas>`** at the target size — the browser's built-in interpolation handles the downscaling
4. **Exports as a compressed Blob** via `canvas.toBlob()` in the chosen format and quality

No Web Workers. No WebAssembly. No dependencies. Just the Canvas API that's been in every browser for over a decade.

## FAQ

**Will my users notice the quality difference?**

At 0.8 quality (the default), no. WebP at 80% is visually indistinguishable from the original for photos. For text-heavy images or technical diagrams, bump it to 0.9 or use PNG.

**Does WebP support transparency?**

Yes. Unlike JPEG, WebP preserves alpha channels. Transparent PNGs converted to WebP stay transparent.

**What if the browser doesn't support WebP?**

Every modern browser supports WebP (Chrome, Firefox, Safari 16+, Edge). If you need to support older browsers, use `format: "image/jpeg"`.

**Can I compress images larger than a certain size only?**

```js
const result = file.size > 1024 * 1024
  ? await squish(file)          // Compress if > 1 MB
  : { blob: file, savedPercent: 0 };  // Skip small files
```

**Does this work with drag-and-drop?**

Yes. Drag-and-drop gives you `File` objects, which are `Blob` subclasses — they work directly with `squish()`.

**Does this work in Node.js?**

No. This is a browser-only library — it relies on `<canvas>`, `<img>`, and `URL.createObjectURL()` which are Web APIs. For server-side compression, use [sharp](https://github.com/lovell/sharp).

## Browser Support

| Browser | Supported |
|---|---|
| Chrome 33+ | Yes |
| Firefox 29+ | Yes |
| Safari 16+ | Yes (WebP output) |
| Edge 79+ | Yes |
| IE | No |

Safari 14-15 can read WebP but can't export it via `canvas.toBlob()`. Use `format: "image/jpeg"` for those versions.

## License

MIT
