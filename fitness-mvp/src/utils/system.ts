import { AppState, Linking, Platform } from 'react-native';

export const openAppSettings = async () => {
  try {
    await Linking.openSettings();
  } catch (e) {
    if (__DEV__) console.warn('Failed to open app settings', e);
    // Fallback: try platform-specific URLs if necessary in future
    if (Platform.OS === 'ios') {
      // no-op, iOS Linking.openSettings is the supported path
    }
  }
};

// Opens OS settings, then resolves after the app returns to foreground and runs the provided check.
// Returns the boolean result of check (e.g., permission granted or not).
export const openSettingsAndCheck = async (
  check: () => Promise<boolean>,
  timeoutMs: number = 8000,
): Promise<boolean> => {
  let resolved = false;

  const doCheck = async (resolve: (v: boolean) => void) => {
    try {
      const ok = await check();
      resolved = true;
      resolve(ok);
    } catch {
      resolved = true;
      resolve(false);
    }
  };

  return new Promise<boolean>(async (resolve) => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        // App returned from Settings
        sub.remove();
        doCheck(resolve);
      }
    });

    // Fallback in case AppState event is missed
    const timer = setTimeout(() => {
      try {
        sub.remove();
      } catch {}
      if (!resolved) doCheck(resolve);
    }, timeoutMs);

    try {
      await Linking.openSettings();
    } catch (e) {
      if (__DEV__) console.warn('Failed to open settings', e);
      clearTimeout(timer);
      try { sub.remove(); } catch {}
      resolve(false);
    }
  });
};
