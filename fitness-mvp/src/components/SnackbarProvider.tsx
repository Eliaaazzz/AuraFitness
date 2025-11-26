import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Platform, ViewStyle } from 'react-native';
import { Portal, Snackbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Variant = 'default' | 'success' | 'error';

type SnackbarOptions = {
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
  variant?: Variant;
};

type SnackbarContextValue = {
  showSnackbar: (message: string, options?: SnackbarOptions) => void;
  showTopSnackbar: (message: string, options?: SnackbarOptions) => void;
  dismissSnackbar: (position?: 'top' | 'bottom') => void;
};

const SnackbarContext = createContext<SnackbarContextValue | undefined>(undefined);

export const SnackbarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const insets = useSafeAreaInsets();

  type Item = { message: string; options?: SnackbarOptions };

  // Bottom channel state + queue
  const [bottomVisible, setBottomVisible] = useState(false);
  const [bottomCurrent, setBottomCurrent] = useState<Item | null>(null);
  const [bottomQueue, setBottomQueue] = useState<Item[]>([]);

  // Top channel state + queue
  const [topVisible, setTopVisible] = useState(false);
  const [topCurrent, setTopCurrent] = useState<Item | null>(null);
  const [topQueue, setTopQueue] = useState<Item[]>([]);

  const getStyle = (variant: Variant): ViewStyle | undefined => {
    switch (variant) {
      case 'success':
        return { backgroundColor: '#16a34a' };
      case 'error':
        return { backgroundColor: '#dc2626' };
      default:
        return undefined;
    }
  };

  const showSnackbar = useCallback((msg: string, options?: SnackbarOptions) => {
    const item: Item = { message: msg, options };
    if (!bottomVisible && !bottomCurrent) {
      setBottomCurrent(item);
      setBottomVisible(true);
    } else {
      setBottomQueue((q) => [...q, item]);
    }
  }, [bottomCurrent, bottomVisible]);

  const showTopSnackbar = useCallback((msg: string, options?: SnackbarOptions) => {
    const item: Item = { message: msg, options };
    if (!topVisible && !topCurrent) {
      setTopCurrent(item);
      setTopVisible(true);
    } else {
      setTopQueue((q) => [...q, item]);
    }
  }, [topCurrent, topVisible]);

  const dismissSnackbar = useCallback((position: 'top' | 'bottom' = 'bottom') => {
    if (position === 'bottom') setBottomVisible(false);
    else setTopVisible(false);
  }, []);

  const value = useMemo(
    () => ({ showSnackbar, showTopSnackbar, dismissSnackbar }),
    [showSnackbar, showTopSnackbar, dismissSnackbar],
  );

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <Portal>
        {/* Bottom Snackbar */}
        <Snackbar
          visible={bottomVisible && !!bottomCurrent}
          onDismiss={() => {
            setBottomVisible(false);
            setBottomCurrent(null);
            if (bottomQueue.length > 0) {
              const [next, ...rest] = bottomQueue;
              setBottomQueue(rest);
              // Let previous unmount before showing next
              setTimeout(() => {
                setBottomCurrent(next);
                setBottomVisible(true);
              }, 40);
            }
          }}
          duration={bottomCurrent?.options?.duration ?? Platform.select({ ios: 2600, android: 3200, default: 2800 })!}
          action={bottomCurrent?.options?.actionLabel ? { label: bottomCurrent.options.actionLabel!, onPress: () => bottomCurrent.options?.onAction?.() } : undefined}
          style={[{ marginBottom: insets.bottom + (Platform.OS === 'ios' ? 12 : 16) }, getStyle(bottomCurrent?.options?.variant ?? 'default')]}
        >
          {bottomCurrent?.message ?? ''}
        </Snackbar>

        {/* Top Snackbar */}
        <Snackbar
          visible={topVisible && !!topCurrent}
          onDismiss={() => {
            setTopVisible(false);
            setTopCurrent(null);
            if (topQueue.length > 0) {
              const [next, ...rest] = topQueue;
              setTopQueue(rest);
              setTimeout(() => {
                setTopCurrent(next);
                setTopVisible(true);
              }, 40);
            }
          }}
          duration={topCurrent?.options?.duration ?? Platform.select({ ios: 2400, android: 2800, default: 2600 })!}
          wrapperStyle={{ position: 'absolute', top: insets.top + (Platform.OS === 'ios' ? 12 : 16), left: 0, right: 0 }}
          style={[{ alignSelf: 'center' }, getStyle(topCurrent?.options?.variant ?? 'default')]}
        >
          {topCurrent?.message ?? ''}
        </Snackbar>
      </Portal>
    </SnackbarContext.Provider>
  );
};

export const useSnackbar = () => {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error('useSnackbar must be used within a SnackbarProvider');
  return ctx;
};
