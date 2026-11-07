import { HttpErrorResponse } from '@angular/common/http';

/**
 * Maps raw HTTP errors and GraphQL errors to clear, friendly user messages.
 */
export function getFriendlyErrorMessage(err: unknown, fallbackMessage = 'An unexpected error occurred. Please try again.'): string {
  if (!err) return fallbackMessage;

  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return 'Unable to connect to the server. Please check your internet connection or mock server.';
    }
    if (err.status >= 500) {
      return 'The server encountered an error. Please try again in a few moments.';
    }
    if (err.status === 404) {
      return 'The requested resource was not found.';
    }
    if (err.status === 400 || err.status === 422) {
      return err.error?.message || 'Invalid request. Please check your inputs.';
    }
  }

  if (err instanceof Error) {
    // Catch common browser network error strings
    if (err.message.includes('Unknown Error') || err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      return 'Unable to connect to the server. Please check your network connection.';
    }
    // Return custom application/GraphQL error messages
    if (err.message && !err.message.startsWith('Http failure response')) {
      return err.message;
    }
  }

  return fallbackMessage;
}
