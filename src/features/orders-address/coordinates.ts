export function parseDestinationPoint(text: string): { latitude: number; longitude: number } | null {
  const value = text.trim();
  let pair = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/.exec(value)?.slice(1);
  if (!pair) {
    try {
      const url = new URL(value);
      if (
        url.protocol !== 'https:' ||
        !['www.google.com', 'maps.google.com', 'google.com', 'www.google.com.br'].includes(url.hostname)
      )
        return null;
      // A map camera (@lat,lng) is not the destination. Only accept an explicit place pin or coordinate query.
      pair = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(url.pathname)?.slice(1);
      const query = url.searchParams.get('q') ?? url.searchParams.get('query') ?? '';
      pair ??= /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/.exec(query)?.slice(1);
    } catch {
      return null;
    }
  }
  if (!pair) return null;
  const [latitude, longitude] = pair.map(Number);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  )
    return null;
  return { latitude, longitude };
}
