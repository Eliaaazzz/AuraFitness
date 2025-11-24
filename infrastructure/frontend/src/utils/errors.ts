import type { AxiosError } from 'axios';

type ApiResponse<T> = { message?: string; data?: T };

const isAxiosError = (error: any): error is AxiosError => {
  return !!error && typeof error === 'object' && ('isAxiosError' in error || 'response' in error || 'code' in error);
};

export const getFriendlyErrorMessage = (error: unknown): string => {
  if (isAxiosError(error)) {
    // Timeout
    if (error.code === 'ECONNABORTED') return 'Request timed out, try again.';

    // Offline / network
    if (error.message === 'Network Error') return 'Check internet connection and try again.';

    const status = error.response?.status ?? 0;

    if (status >= 500) return 'Something went wrong, try again.';
    if (status === 0) return 'Unable to reach the server. Please try again later.';

    const data = error.response?.data as ApiResponse<unknown> | undefined;
    const apiMessage = typeof data?.message === 'string' ? data.message : undefined;
    if (apiMessage) return apiMessage;
  }

  if (error instanceof Error && error.message) return error.message;

  return 'Request failed. Please try again.';
};

