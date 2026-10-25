// Ayudas de combos que se usan en el servidor y en el navegador (sin acceso a datos).

/** ¿Esta variante entra en el combo? Un combo puede ser para una memoria exacta del celular (cualquier color). */
export const varianteEnCombo = (
  c: { memoria: { ram: number | null; alm: number | null } | null },
  v: { ramGb: number | null; almacenamientoGb: number | null }
) => !c.memoria || ((c.memoria.ram ?? null) === (v.ramGb ?? null) && (c.memoria.alm ?? null) === (v.almacenamientoGb ?? null));
