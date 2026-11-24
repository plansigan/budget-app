import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Registers the PWA service worker on HTTPS web builds and exposes
 * reactive update readiness + reload/dismiss controls.
 */
export function usePwaUpdate() {
  const [pwaUpdateReady, setPwaUpdateReady] = useState(false);

  useEffect(() => {
    if (
      Platform.OS !== 'web' ||
      typeof window === 'undefined' ||
      typeof navigator === 'undefined' ||
      !('serviceWorker' in navigator) ||
      window.location.protocol !== 'https:'
    ) {
      return;
    }

    let active = true;
    const sw = navigator.serviceWorker;
    const hadController = Boolean(sw.controller);
    let trackedReg: ServiceWorkerRegistration | null = null;
    let trackedInstalling: ServiceWorker | null = null;

    const handleControllerChange = () => {
      if (active && hadController) {
        setPwaUpdateReady(true);
      }
    };

    const handleInstallingState = () => {
      if (!active || !trackedInstalling) return;
      if (trackedInstalling.state === 'installed' && sw.controller) {
        setPwaUpdateReady(true);
      }
    };

    const handleUpdateFound = () => {
      if (!trackedReg) return;
      if (trackedInstalling) {
        trackedInstalling.removeEventListener(
          'statechange',
          handleInstallingState
        );
      }
      trackedInstalling = trackedReg.installing;
      if (trackedInstalling) {
        trackedInstalling.addEventListener('statechange', handleInstallingState);
      }
    };

    sw.addEventListener('controllerchange', handleControllerChange);

    sw.register('./sw.js', { updateViaCache: 'none' })
      .then((reg) => {
        if (!active) return;
        trackedReg = reg;
        if (reg.waiting && hadController) {
          setPwaUpdateReady(true);
        }
        reg.addEventListener('updatefound', handleUpdateFound);
      })
      .catch(() => {
        // Ignore service worker registration errors silently
      });

    return () => {
      active = false;
      sw.removeEventListener('controllerchange', handleControllerChange);
      if (trackedReg) {
        trackedReg.removeEventListener('updatefound', handleUpdateFound);
      }
      if (trackedInstalling) {
        trackedInstalling.removeEventListener(
          'statechange',
          handleInstallingState
        );
      }
    };
  }, []);

  const dismissUpdate = useCallback(() => {
    setPwaUpdateReady(false);
  }, []);

  const reloadForUpdate = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }, []);

  return { pwaUpdateReady, dismissUpdate, reloadForUpdate };
}
