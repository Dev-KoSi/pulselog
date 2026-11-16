import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { makeDemoAvatar } from '../../lib/avatar';
import { fileToResizedDataUrl } from '../../lib/image';
import type { CaptureMethod } from '../../types';
import { CameraIcon } from '../icons';
import { Button, buttonClassName } from '../ui/Button';
import styles from './SelfieCapture.module.css';

const OUTPUT_SIZE = 480;

interface SelfieCaptureProps {
  value: string | null;
  onCapture: (dataUrl: string, method: CaptureMethod) => void;
  onError: (message: string | null) => void;
  /** Used for the demo avatar's initials. */
  avatarName: string;
  disabled?: boolean;
}

/** getUserMedia only works in a secure context (HTTPS or localhost). */
const liveCameraSupported = () =>
  typeof window !== 'undefined' && window.isSecureContext && Boolean(navigator.mediaDevices?.getUserMedia);

function cameraErrorMessage(err: unknown) {
  const name = err instanceof DOMException ? err.name : '';
  if (name === 'NotAllowedError') return 'Camera permission was denied. Allow camera access, or use one of the options below.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No camera was found on this device. Use one of the options below.';
  if (name === 'NotReadableError') return 'The camera is being used by another app. Close it and try again.';
  return 'Could not start the camera. Use one of the options below.';
}

/**
 * Selfie step, best option first:
 * 1. Live in-page camera (webcams + phones over HTTPS/localhost)
 * 2. The phone's native camera via <input capture="user"> (works over plain HTTP on the LAN)
 * 3. A generated demo avatar, for quick demo testing without any camera
 */
export function SelfieCapture({ value, onCapture, onError, avatarName, disabled = false }: SelfieCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [starting, setStarting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [liveSupported] = useState(liveCameraSupported);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]); // release the camera if the step unmounts

  useEffect(() => {
    const video = videoRef.current;
    if (cameraOn && video && streamRef.current) {
      video.srcObject = streamRef.current;
      void video.play().catch(() => undefined);
    }
  }, [cameraOn]);

  async function startCamera() {
    onError(null);
    setStarting(true);
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      setCameraOn(true);
    } catch (err) {
      onError(cameraErrorMessage(err));
    } finally {
      setStarting(false);
    }
  }

  function captureFrame() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const side = Math.min(video.videoWidth, video.videoHeight);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Centre square crop, mirrored so the photo matches the preview the student saw.
    ctx.translate(OUTPUT_SIZE, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, (video.videoWidth - side) / 2, (video.videoHeight - side) / 2, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    onCapture(canvas.toDataURL('image/jpeg', 0.82), 'camera');
    stopCamera();
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-selecting the same photo
    if (!file) return;
    onError(null);
    setProcessing(true);
    try {
      onCapture(await fileToResizedDataUrl(file, OUTPUT_SIZE), 'upload');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not read that photo.');
    } finally {
      setProcessing(false);
    }
  }

  function useDemoAvatar() {
    onError(null);
    try {
      onCapture(makeDemoAvatar(avatarName, OUTPUT_SIZE), 'demo-avatar');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not create the demo avatar.');
    }
  }

  const busy = disabled || processing || starting;

  /** The phone's own camera app (or a file picker on laptops). */
  const nativeCameraInput = (
    <input type="file" accept="image/*" capture="user" className="visually-hidden" onChange={handleFile} disabled={busy} />
  );

  // --- Live camera viewfinder -------------------------------------------------
  if (cameraOn) {
    return (
      <div className={styles.block}>
        <span className={styles.label}>Face verification</span>
        <div className={styles.viewfinder}>
          <video ref={videoRef} className={styles.video} autoPlay playsInline muted aria-label="Live camera preview" />
          <span className={styles.guide} aria-hidden="true" />
        </div>
        <span className={styles.hint}>Centre your face in the circle, then capture.</span>
        <div className={styles.actions}>
          <Button onClick={captureFrame} block className={styles.captureButton}>
            <CameraIcon width={20} height={20} /> Capture selfie
          </Button>
          <Button variant="ghost" onClick={stopCamera} block>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // --- Preview / start --------------------------------------------------------
  return (
    <div className={styles.block}>
      <span className={styles.label}>Face verification</span>

      {liveSupported ? (
        <button type="button" className={`${styles.circle} ${value ? styles.hasPhoto : ''}`} onClick={startCamera} disabled={busy}>
          {value ? (
            <img src={value} alt="Your selfie (tap to retake)" className={styles.preview} />
          ) : (
            <span className={styles.placeholder}>
              <CameraIcon width={36} height={36} />
              {starting ? 'Starting camera…' : 'Tap to open camera'}
            </span>
          )}
        </button>
      ) : (
        <label className={`${styles.circle} ${value ? styles.hasPhoto : ''}`}>
          {nativeCameraInput}
          {value ? (
            <img src={value} alt="Your selfie (tap to retake)" className={styles.preview} />
          ) : (
            <span className={styles.placeholder}>
              <CameraIcon width={36} height={36} />
              {processing ? 'Processing…' : 'Tap to take a selfie'}
            </span>
          )}
        </label>
      )}

      <span className={styles.hint}>
        {value ? 'Tap the photo to retake it.' : 'Face the camera in good light, with no sunglasses or mask.'}
      </span>

      <div className={styles.alternatives}>
        {liveSupported && (
          <label className={buttonClassName('secondary', false, styles.altButton)}>
            {nativeCameraInput}
            Use camera app
          </label>
        )}
        <Button variant="ghost" onClick={useDemoAvatar} disabled={busy} className={styles.altButton}>
          Use demo avatar
        </Button>
      </div>
    </div>
  );
}
