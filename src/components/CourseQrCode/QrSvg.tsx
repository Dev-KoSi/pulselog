import { QRCodeSVG } from 'qrcode.react';

/** The check-in QR as crisp SVG; the wrapping control carries the accessible name. */
export function QrSvg({ url, className }: { url: string; className?: string }) {
  return (
    <QRCodeSVG
      value={url}
      size={256}
      level="M"
      marginSize={2}
      bgColor="#FFFFFF"
      fgColor="#0F172A"
      aria-hidden="true"
      className={className}
    />
  );
}
