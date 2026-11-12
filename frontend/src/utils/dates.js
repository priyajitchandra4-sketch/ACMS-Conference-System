// The backend returns deadline times as UTC but without a "Z" suffix,
// so the browser would read them as local time and show the wrong hour.
// parseUtc adds the missing "Z" before building the Date.
export function parseUtc(value) {
  if (!value) return null;
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value);
  return new Date(hasZone ? value : `${value}Z`);
}