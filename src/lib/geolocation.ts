import type { GeoPoint } from '../types';

export class LocationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LocationError';
  }
}

/** True when this page may use device location at all (https://, or localhost). */
export const canUseLocation = () => window.isSecureContext && 'geolocation' in navigator;

/**
 * One fresh, high-accuracy fix from the device (GPS on phones, Wi-Fi positioning on laptops).
 * Rejects with a LocationError whose message is safe to show to the user.
 */
export function getCurrentLocation(timeoutMs = 20_000): Promise<GeoPoint> {
  if (!window.isSecureContext) {
    return Promise.reject(
      new LocationError(
        'Location only works on a secure (https://) link. Ask your lecturer to start Pulselog in HTTPS mode, then scan again.',
      ),
    );
  }
  if (!('geolocation' in navigator)) {
    return Promise.reject(new LocationError('This browser can’t share your location. Try Chrome or Safari.'));
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude, accuracy: Math.round(coords.accuracy) }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(
            new LocationError(
              'Location access is blocked. Allow location for this site (tap the icon next to the address bar), then try again.',
            ),
          );
        } else if (err.code === err.TIMEOUT) {
          reject(new LocationError('Finding your location took too long. Move near a window or turn on GPS, then try again.'));
        } else {
          reject(new LocationError('Your location isn’t available. Turn on Location / GPS on your device, then try again.'));
        }
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    );
  });
}

/** "45 m" / "1.2 km" */
export const formatDistance = (meters: number) =>
  meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
