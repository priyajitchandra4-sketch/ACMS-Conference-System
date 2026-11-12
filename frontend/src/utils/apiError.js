// Turns an axios error into a readable message.
// FastAPI sends a string for normal errors and a list for 422 validation errors.
export function apiError(err, fallback = 'Something went wrong.') {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e) => `${(e.loc || []).slice(1).join('.')}: ${e.msg}`)
      .join(' | ');
  }
  if (!err?.response) return 'Cannot reach the server. Is the backend running?';
  return fallback;
}