import { useEffect, useRef, useState } from 'react';
import { Button } from './Button';

/** Copies text to the clipboard, with a prompt fallback for insecure (plain HTTP LAN) contexts. */
export function CopyButton({ text, label = 'Copy link' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this check-in link:', text);
    }
  }

  return (
    <Button variant="secondary" onClick={handleCopy} aria-live="polite">
      {copied ? 'Copied ✓' : label}
    </Button>
  );
}
