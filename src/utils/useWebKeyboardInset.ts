import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export interface WebKeyboardMetrics {
  keyboardInset: number;
  viewportHeight: number;
  offsetTop: number;
}

const ZERO_METRICS: WebKeyboardMetrics = {
  keyboardInset: 0,
  viewportHeight: 0,
  offsetTop: 0,
};

/**
 * Tracks iOS Safari / mobile browser virtual keyboard overlap via `window.visualViewport`
 * so centered modals lift above the numpad/keyboard instead of getting covered.
 */
export function useWebKeyboardInset(enabled: boolean = true): WebKeyboardMetrics {
  const [metrics, setMetrics] = useState<WebKeyboardMetrics>(ZERO_METRICS);

  useEffect(() => {
    if (!enabled || Platform.OS !== 'web' || typeof window === 'undefined') {
      setMetrics((prev) =>
        prev.keyboardInset === 0 &&
        prev.viewportHeight === 0 &&
        prev.offsetTop === 0
          ? prev
          : ZERO_METRICS
      );
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
