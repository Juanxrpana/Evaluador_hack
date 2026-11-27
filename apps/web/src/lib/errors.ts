/** Extracts a human-readable message from an oRPC client error. */
export function messageOf(cause: unknown): string {
  if (cause && typeof cause === 'object' && 'message' in cause) {
    const message = (cause as { message?: unknown }).message;

    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
  }

  return 'Ocurrió un error inesperado';
}
