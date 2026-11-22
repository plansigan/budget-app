import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export interface WebKeyboardMetrics {
  keyboardInset: number;
  viewportHeight: number;
  offsetTop: number;
}

/**
 * Tracks iOS Safari / mobile browser virtual keyboard overlap via `window.visualViewport`
 * so centered modals lift above the numpad/keyboard instead of getting covered.
 */
export function useWebKeyboardInset(enabled: boolean = true): WebKeyboardMetrics {
  const [metrics, setMetrics] = useState<WebKeyboardMetrics>({
    keyboardInset: 0,
    viewportHeight: 0,
    offsetTop: 0,
  });

  useEffect(() => {
    if (
      !enabled ||
      Platform.OS !== 'web' ||
      typeof window === 'undefined'
    ) {
      setMetrics({ keyboardInset: 0, viewportHeight: 0, offsetTop: 0 });
      return;
    }

    const vv = window.visualViewport;
    if (!vv) {
      return;
    }

    const update = () => {
      const vh = Math.round(vv.height);
      const offsetTop = Math.max(0, Math.round(vv.offsetTop || 0));
      const rawInset = Math.round(window.innerHeight - vv.height - offsetTop);
      // Treat small browser chrome shifts (< 90px) as non-keyboard UI chrome.
      const keyboardInset = rawInset > 90 ? rawInset : 0;
      setMetrics((prev) =>
        prev.keyboardInset === keyboardInset &&
        prev.viewportHeight === vh &&
        prev.offsetTop === offsetTop
          ? prev
          : { keyboardInset, viewportHeight: vh, offsetTop }
      );
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('resize', update);

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [enabled]);

  return metrics;
}
