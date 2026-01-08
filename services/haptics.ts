
/**
 * Haptic feedback utility for mobile devices.
 * Uses the Web Vibration API to provide tactile responses.
 */
export const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light') => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    switch (type) {
      case 'light':
        navigator.vibrate(10);
        break;
      case 'medium':
        navigator.vibrate(20);
        break;
      case 'heavy':
        navigator.vibrate(40);
        break;
      case 'success':
        navigator.vibrate([20, 50, 20]);
        break;
      case 'error':
        navigator.vibrate([50, 100, 50, 100]);
        break;
      default:
        navigator.vibrate(10);
    }
  }
};
