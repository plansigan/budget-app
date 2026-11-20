import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Triggers a light tactile tap for chips, slider ticks, and tab switches.
 */
export async function triggerLightHaptic(): Promise<void> {
  try {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(10);
    }
  } catch {
    // Ignore haptic errors on unsupported devices
  }
}

/**
 * Triggers a medium/success haptic when logging an expense or skipped impulse.
 */
export async function triggerSuccessHaptic(): Promise<void> {
  try {
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([18, 30, 24]);
    }
  } catch {
    // Ignore haptic errors on unsupported devices
  }
}

/**
 * Triggers a celebratory double-pulse haptic when claiming a 100%-funded Treat Pass.
 */
export async function triggerCelebrationHaptic(): Promise<void> {
  try {
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      }, 120);
    } else if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([25, 40, 35, 40, 45]);
    }
  } catch {
    // Ignore haptic errors on unsupported devices
  }
}
