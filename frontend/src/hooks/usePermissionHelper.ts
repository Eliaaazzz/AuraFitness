import { useCallback } from 'react';

import { useSnackbar } from '@/components';
import { openSettingsAndCheck } from '@/utils';

type PermResponse = { status: 'granted' | 'denied' | 'undetermined' };

type RequestFn = () => Promise<PermResponse>;
type RefreshFn = () => Promise<PermResponse>;

type Labels = {
  denied: string;
  granted: string;
  stillDenied: string;
};

export const usePermissionHelper = () => {
  const { showTopSnackbar } = useSnackbar();

  const requestWithTopSnackbar = useCallback(
    async (request: RequestFn, refresh: RefreshFn, labels: Labels): Promise<boolean> => {
      const resp = await request();
      if (resp?.status === 'granted') return true;

      showTopSnackbar(labels.denied, {
        variant: 'error',
        actionLabel: 'Settings',
        onAction: async () => {
          const granted = await openSettingsAndCheck(async () => {
            const r = await refresh();
            return r.status === 'granted';
          });
          showTopSnackbar(granted ? labels.granted : labels.stillDenied, {
            variant: granted ? 'success' : 'error',
          });
        },
      });

      return false;
    },
    [showTopSnackbar],
  );

  return { requestWithTopSnackbar };
};

