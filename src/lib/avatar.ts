function hash(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '?'
  );
}

/**
 * Demo-only "selfie": a generated head-and-shoulders avatar with the student's initials.
 * Lets presenters test the flow on a laptop with no webcam. Records made this way are
 * tagged `captureMethod: "demo-avatar"` so they're never mistaken for real verifications.
 */
export function makeDemoAvatar(name: string, size = 480): string {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser cannot generate the demo avatar.');

  const hue = hash(name) % 360;
  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, `hsl(${hue} 70% 92%)`);
  bg.addColorStop(1, `hsl(${(hue + 40) % 360} 60% 80%)`);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // Shoulders + head
  ctx.fillStyle = `hsl(${hue} 40% 32%)`;
  ctx.beginPath();
  ctx.ellipse(size / 2, size * 1.04, size * 0.42, size * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `hsl(${hue} 30% 52%)`;
  ctx.beginPath();
  ctx.arc(size / 2, size * 0.42, size * 0.21, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${Math.round(size * 0.14)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials(name), size / 2, size * 0.43);

  // Light grain so the JPEG resembles a real photo in size (the mock verifier rejects near-blank images).
  for (let i = 0; i < 6000; i++) {
    ctx.fillStyle = `rgb(${Math.random() < 0.5 ? '0 0 0' : '255 255 255'} / 0.06)`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }

  return canvas.toDataURL('image/jpeg', 0.85);
}
