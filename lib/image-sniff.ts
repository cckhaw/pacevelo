export type SniffedImage = { extension: "png" | "jpg" | "webp"; contentType: string };

/** Identifies PNG / JPEG / WebP from magic bytes only - never trusts the filename or client MIME type. SVG is deliberately unsupported. */
export function sniffImage(bytes: Uint8Array): SniffedImage | null {
  const startsWith = (sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { extension: "png", contentType: "image/png" };
  }
  if (startsWith([0xff, 0xd8, 0xff])) {
    return { extension: "jpg", contentType: "image/jpeg" };
  }
  // RIFF....WEBP
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) {
    return { extension: "webp", contentType: "image/webp" };
  }
  return null;
}
