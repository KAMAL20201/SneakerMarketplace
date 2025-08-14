import imageCompression from "browser-image-compression";

export interface CompressionOptions {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  useWebWorker: boolean;
  fileType?: string;
  quality?: number;
  maxIteration?: number;
}

export interface CompressionResult {
  compressedFile: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  fileName: string;
}

export interface CompressionPreset {
  name: string;
  options: CompressionOptions;
  description: string;
}

// Predefined compression presets for different use cases
export const compressionPresets: Record<string, CompressionPreset> = {
  thumbnail: {
    name: "Thumbnail",
    options: {
      maxSizeMB: 0.1,
      maxWidthOrHeight: 150,
      useWebWorker: true,
      quality: 0.7,
    },
    description: "Small thumbnails for previews",
  },
  standard: {
    name: "Standard",
    options: {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 800,
      useWebWorker: true,
      quality: 0.8,
    },
    description: "Standard quality for general use",
  },
  high: {
    name: "High Quality",
    options: {
      maxSizeMB: 1.0,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
      quality: 0.9,
    },
    description: "High quality for detailed images",
  },
  web: {
    name: "Web Optimized",
    options: {
      maxSizeMB: 0.3,
      maxWidthOrHeight: 600,
      useWebWorker: true,
      quality: 0.75,
    },
    description: "Optimized for web display",
  },
  storage: {
    name: "Storage Optimized",
    options: {
      maxSizeMB: 0.2,
      maxWidthOrHeight: 400,
      useWebWorker: true,
      quality: 0.6,
    },
    description: "Minimal size for storage efficiency",
  },
};

/**
 * Compress a single image file
 */
export async function compressImage(
  file: File,
  options: CompressionOptions
): Promise<CompressionResult> {
  try {
    const originalSize = file.size;

    const compressedFile = await imageCompression(file, options);

    const compressedSize = compressedFile.size;
    const compressionRatio =
      ((originalSize - compressedSize) / originalSize) * 100;

    return {
      compressedFile,
      originalSize,
      compressedSize,
      compressionRatio,
      fileName: file.name,
    };
  } catch (error) {
    console.error("Image compression failed:", error);
    throw new Error(
      `Failed to compress image: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Compress multiple images with the same options
 */
export async function compressImages(
  files: File[],
  options: CompressionOptions
): Promise<CompressionResult[]> {
  const compressionPromises = files.map((file) => compressImage(file, options));
  return Promise.all(compressionPromises);
}

/**
 * Compress images using a preset
 */
export async function compressImagesWithPreset(
  files: File[],
  presetName: keyof typeof compressionPresets
): Promise<CompressionResult[]> {
  const preset = compressionPresets[presetName];
  if (!preset) {
    throw new Error(`Preset '${presetName}' not found`);
  }

  return compressImages(files, preset.options);
}

/**
 * Smart compression that automatically selects the best preset based on file size
 */
export async function smartCompressImages(
  files: File[],
): Promise<CompressionResult[]> {
  const results: CompressionResult[] = [];

  for (const file of files) {
    const fileSizeMB = file.size / (1024 * 1024);

    // Select preset based on file size
    let selectedPreset: keyof typeof compressionPresets;

    if (fileSizeMB > 2) {
      selectedPreset = "storage";
    } else if (fileSizeMB > 1) {
      selectedPreset = "web";
    } else if (fileSizeMB > 0.5) {
      selectedPreset = "standard";
    } else {
      selectedPreset = "high";
    }

    const result = await compressImage(
      file,
      compressionPresets[selectedPreset].options
    );
    results.push(result);
  }

  return results;
}

/**
 * Create custom compression options
 */
export function createCustomOptions(
  maxSizeMB: number,
  maxWidthOrHeight: number,
  quality: number = 0.8
): CompressionOptions {
  return {
    maxSizeMB,
    maxWidthOrHeight,
    useWebWorker: true,
    quality,
  };
}

/**
 * Validate if a file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

/**
 * Get file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Calculate total size of files
 */
export function calculateTotalSize(files: File[]): number {
  return files.reduce((total, file) => total + file.size, 0);
}

/**
 * Get compression statistics
 */
export function getCompressionStats(results: CompressionResult[]): {
  totalOriginalSize: number;
  totalCompressedSize: number;
  averageCompressionRatio: number;
  totalSavings: number;
} {
  const totalOriginalSize = results.reduce(
    (sum, result) => sum + result.originalSize,
    0
  );
  const totalCompressedSize = results.reduce(
    (sum, result) => sum + result.compressedSize,
    0
  );
  const totalSavings = totalOriginalSize - totalCompressedSize;
  const averageCompressionRatio =
    results.length > 0
      ? results.reduce((sum, result) => sum + result.compressionRatio, 0) /
        results.length
      : 0;

  return {
    totalOriginalSize,
    totalCompressedSize,
    averageCompressionRatio,
    totalSavings,
  };
}
