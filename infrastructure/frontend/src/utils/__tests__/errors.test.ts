import { getFriendlyErrorMessage } from '@/utils/errors';

describe('getFriendlyErrorMessage', () => {
  it('handles timeout errors', () => {
    const err = { code: 'ECONNABORTED', message: 'timeout', isAxiosError: true };
    expect(getFriendlyErrorMessage(err)).toBe('Request timed out, try again.');
  });

  it('handles network errors', () => {
    const err = { message: 'Network Error', isAxiosError: true };
    expect(getFriendlyErrorMessage(err)).toBe('Check internet connection and try again.');
  });

  it('handles 5xx errors', () => {
    const err = { isAxiosError: true, response: { status: 500 } };
    expect(getFriendlyErrorMessage(err)).toBe('Something went wrong, try again.');
  });

  it('handles unreachable server', () => {
    const err = { isAxiosError: true, response: { status: 0 } };
    expect(getFriendlyErrorMessage(err)).toBe('Unable to reach the server. Please try again later.');
  });

  it('uses API message when present', () => {
    const err = { isAxiosError: true, response: { status: 400, data: { message: 'Invalid payload' } } };
    expect(getFriendlyErrorMessage(err)).toBe('Invalid payload');
  });

  it('falls back to generic message', () => {
    expect(getFriendlyErrorMessage({})).toBe('Request failed. Please try again.');
  });
});

