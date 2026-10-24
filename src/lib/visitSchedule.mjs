export const VISIT_TIMEZONE = 'America/Sao_Paulo';
export const VISIT_STATUS = { requested: 'Aguardando confirmação', confirmed: 'Confirmada', cancelled: 'Cancelada', checked_in: 'Em visita', completed: 'Concluída', checked_out: 'Concluída', disputed: 'Registro anterior contestado', no_show: 'Ausência informada' };
/** @param {Date|string|number} [value] */
export function visitLocalDate(value = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: VISIT_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}
export function visitLocalTime(value) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: VISIT_TIMEZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value));
}
export function formatVisitDate(value) {
  return value ? new Intl.DateTimeFormat('pt-BR', { timeZone: VISIT_TIMEZONE, dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : 'Sem horário';
}
export function visitInterval(date, time, duration = 60, now = Date.now()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || !Number.isInteger(duration) || duration < 15 || duration > 240) throw new Error('Informe uma data, horário e duração válidos.');
  // Resolve a hora civil no fuso do produto, independentemente do dispositivo.
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  let instant = Date.UTC(year, month - 1, day, hour, minute);
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: VISIT_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(instant));
    const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
    const represented = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
    const correction = Date.UTC(year, month - 1, day, hour, minute) - represented;
    instant += correction;
    if (!correction) break;
  }
  if (visitLocalDate(instant) !== date || visitLocalTime(instant) !== time || instant <= now) throw new Error('Escolha um horário futuro válido, no horário de Brasília.');
  return { start: new Date(instant).toISOString(), end: new Date(instant + duration * 60000).toISOString() };
}
