export function formatCurrency(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}
export function formatDistance(meters: number) {
  return meters < 1000
    ? new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(meters) + ' m'
    : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(meters / 1000) + ' km';
}
export function formatDuration(seconds: number) {
  const minutes = Math.ceil(seconds / 60);
  return minutes < 60 ? minutes + ' min' : Math.floor(minutes / 60) + ' h ' + (minutes % 60) + ' min';
}
export function formatDate(value: string | null | undefined, timeZone = 'America/Sao_Paulo') {
  if (!value) return 'Não informado';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data inválida';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone }).format(
    date,
  );
}
