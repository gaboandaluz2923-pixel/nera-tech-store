// Fecha tentativa de entrega (pedido de Gabriel, 24 oct 2026). Nadie entrega en domingo:
//   - En bodega ("menos de 24 horas"): el siguiente día de entrega.
//   - Del proveedor ("menos de 48 horas"): dos días de entrega después.
// Se cuentan días en hora de El Salvador (UTC−6) y se salta el domingo. Ejemplos:
//   viernes → 24 h: sábado · 48 h: lunes        sábado → 24 h: lunes · 48 h: martes
// Es una fecha aproximada: los términos aclaran que depende de los aliados logísticos.

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const DIAS_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** Fecha (día en El Salvador, como Date UTC a mediodía) en que llegaría un pedido hecho `ahora` */
export function fechaEntrega(dias: 1 | 2, ahora: Date = new Date()): Date {
  const sv = new Date(ahora.getTime() - 6 * 3_600_000);
  const d = new Date(Date.UTC(sv.getUTCFullYear(), sv.getUTCMonth(), sv.getUTCDate(), 12));
  let faltan = dias;
  while (faltan > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (d.getUTCDay() !== 0) faltan -= 1; // el domingo no cuenta
  }
  return d;
}

/** "lunes 26 de octubre" */
export const textoFechaLarga = (d: Date) => `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`;
/** "lun 26" */
export const textoFechaCorta = (d: Date) => `${DIAS_CORTOS[d.getUTCDay()]} ${d.getUTCDate()}`;

/** Días según la disponibilidad: bodega 1, proveedor 2 */
export const diasEntrega = (disponibilidad: string): 1 | 2 | null =>
  disponibilidad === "bodega" ? 1 : disponibilidad === "proveedor" ? 2 : null;
