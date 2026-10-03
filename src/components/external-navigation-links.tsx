export function ExternalNavigationLinks({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  )
    return null;
  const coordinates = encodeURIComponent(latitude + ',' + longitude);
  return (
    <nav aria-label="Navegação externa">
      <a
        href={'https://www.google.com/maps/dir/?api=1&destination=' + coordinates}
        target="_blank"
        rel="noopener noreferrer"
      >
        Abrir no Google Maps
      </a>
      {' · '}
      <a
        href={'https://waze.com/ul?ll=' + coordinates + '&navigate=yes'}
        target="_blank"
        rel="noopener noreferrer"
      >
        Abrir no Waze
      </a>
    </nav>
  );
}
