/**
 * Reduces timing side-channels for endpoints that branch on user existence (e.g. forgot-password).
 */
export async function withMinimumDuration<T>(ms: number, fn: () => Promise<T>): Promise<T> {
  const started = Date.now();
  try {
    return await fn();
  } finally {
    const elapsed = Date.now() - started;
    if (elapsed < ms) {
      await new Promise((resolve) => setTimeout(resolve, ms - elapsed));
    }
  }
}
