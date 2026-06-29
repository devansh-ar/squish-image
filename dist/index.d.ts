export interface SquishOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: "image/webp" | "image/jpeg" | "image/png";
}

export interface SquishResult {
  blob: Blob;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  originalSize: number;
  compressedSize: number;
  ratio: number;
  savedPercent: number;
  format: string;
}

export function squish(file: File | Blob, options?: SquishOptions): Promise<SquishResult>;
export function squishAll(files: (File | Blob)[], options?: SquishOptions): Promise<SquishResult[]>;
export function createSquisher(
  defaults?: SquishOptions
): (file: File | Blob, options?: SquishOptions) => Promise<SquishResult>;
