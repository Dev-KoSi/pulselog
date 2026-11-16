function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read that photo. Please try again.'));
    img.src = src;
  });
}

/**
 * Downscale a camera photo to a small JPEG data URL before upload.
 * Phone cameras produce 3–12 MB images; a ~480px selfie is plenty for verification.
 */
export async function fileToResizedDataUrl(file: File, maxSize = 480, quality = 0.82): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose a photo.');

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Your browser cannot process photos.');
    ctx.drawImage(img, 0, 0, width, height);

    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
