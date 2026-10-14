// Ayudas de la sección Promociones (sin acceso a datos).

/** ISO → "2026-10-18T23:59" en hora de El Salvador (para los campos de fecha y hora) */
export function aLocalSV(iso: string | null): string {
  if (!iso) return "";
  return new Date(new Date(iso).getTime() - 6 * 3_600_000).toISOString().slice(0, 16);
}

export function estadoOferta(o: { activa: boolean; inicio: string | null; fin: string | null }, ahora = Date.now()) {
  if (!o.activa) return "apagada" as const;
  if (o.fin && new Date(o.fin).getTime() < ahora) return "terminada" as const;
  if (o.inicio && new Date(o.inicio).getTime() > ahora) return "programada" as const;
  return "activa" as const;
}
