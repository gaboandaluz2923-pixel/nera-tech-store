import catalogo from "./catalogo-mh.json";

// Catálogos de Hacienda (Catálogos – Facturación Electrónica v1.1, 07/2026) que usa la tienda.
// Departamento (CAT-012), municipio (CAT-013, división de 2024) y distrito (CAT-008, los municipios de antes)
// van como códigos en la dirección; la actividad económica (CAT-019) en emisor y receptor de crédito fiscal.

export type Codigo = { codigo: string; nombre: string };
export type CodigoDepto = Codigo & { departamento: string };

export const DEPARTAMENTOS_MH = catalogo.departamentos as Codigo[];
export const MUNICIPIOS_MH = catalogo.municipios as CodigoDepto[];
export const DISTRITOS_MH = catalogo.distritos as CodigoDepto[];
export const ACTIVIDADES_MH = catalogo.actividades as Codigo[];

export const nombreDepartamento = (c: string | null | undefined) => DEPARTAMENTOS_MH.find((d) => d.codigo === c)?.nombre ?? null;
export const nombreMunicipio = (depto: string | null | undefined, c: string | null | undefined) =>
  MUNICIPIOS_MH.find((m) => m.departamento === depto && m.codigo === c)?.nombre ?? null;
export const nombreDistrito = (depto: string | null | undefined, c: string | null | undefined) =>
  DISTRITOS_MH.find((m) => m.departamento === depto && m.codigo === c)?.nombre ?? null;
export const nombreActividad = (c: string | null | undefined) => ACTIVIDADES_MH.find((a) => a.codigo === c)?.nombre ?? null;

export type DireccionMH = { departamento: string; municipio: string; distrito: string; complemento: string };

/** Texto legible de una dirección con códigos (para el PDF y el panel). */
export function textoDireccion(d: DireccionMH | null | undefined): string {
  if (!d) return "";
  const titulo = (s: string | null) => (s ? s.toLowerCase().replace(/(^|\s)\S/g, (x) => x.toUpperCase()) : "");
  const plano = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const distrito = nombreDistrito(d.departamento, d.distrito);
  // El complemento ya trae el distrito (lo exige Hacienda): no se repite
  const yaTrae = distrito ? plano(d.complemento).includes(plano(distrito)) : true;
  return [d.complemento, yaTrae ? "" : titulo(distrito), titulo(nombreMunicipio(d.departamento, d.municipio)), nombreDepartamento(d.departamento)]
    .filter(Boolean)
    .join(", ");
}

export function direccionValida(d: Partial<DireccionMH> | null | undefined): d is DireccionMH {
  return Boolean(
    d &&
      d.departamento &&
      nombreMunicipio(d.departamento, d.municipio) &&
      nombreDistrito(d.departamento, d.distrito) &&
      d.complemento &&
      d.complemento.trim().length >= 1
  );
}

/** CAT-002 */
export const TIPO_DTE = {
  "01": "Factura",
  "03": "Comprobante de crédito fiscal",
  "05": "Nota de crédito",
} as const;
export type TipoDte = keyof typeof TIPO_DTE;

export const VERSION_DTE: Record<TipoDte, number> = { "01": 2, "03": 4, "05": 4 };
export const VERSION_INVALIDACION = 3;
export const VERSION_CONTINGENCIA = 4;

/** CAT-005 */
export const TIPO_CONTINGENCIA: Record<number, string> = {
  1: "No disponibilidad de sistema del MH",
  2: "No disponibilidad de sistema del emisor",
  3: "Falla en el suministro de servicio de Internet del Emisor",
  4: "Falla en el suministro de servicio de energía eléctrica del emisor que impida la transmisión de los DTE",
  5: "Otro",
};

/** CAT-017: forma de pago de la tienda → código de Hacienda */
export const FORMA_PAGO_MH: Record<string, { codigo: string; nombre: string }> = {
  contra_entrega: { codigo: "01", nombre: "Billetes y monedas" },
  transferencia: { codigo: "05", nombre: "Transferencia-Depósito Bancario" },
  wompi: { codigo: "03", nombre: "Tarjeta Crédito" },
  tasa_cero: { codigo: "03", nombre: "Tarjeta Crédito" },
};
export const NOMBRE_FORMA_PAGO: Record<string, string> = {
  "01": "Billetes y monedas",
  "02": "Tarjeta débito",
  "03": "Tarjeta crédito",
  "04": "Cheque",
  "05": "Transferencia o depósito",
  "08": "Dinero electrónico",
  "13": "Cuentas por pagar del receptor",
  "99": "Otros",
};

/** CAT-022 */
export const TIPO_DOCUMENTO_ID: Record<string, string> = {
  "13": "DUI",
  "36": "NIT",
  "03": "Pasaporte",
  "02": "Carnet de residente",
  "37": "Otro",
};

/** CAT-024 */
export const TIPO_INVALIDACION: Record<number, string> = {
  1: "Error en la información del documento",
  2: "Rescindir la operación (devolución total o venta anulada)",
  3: "Otro (incluye cambio de producto)",
};

/** CAT-009 */
export const TIPO_ESTABLECIMIENTO: Record<string, string> = {
  "01": "Sucursal",
  "02": "Casa matriz",
  "04": "Bodega",
  "07": "Patio",
};

export const IVA = { codigo: "20", descripcion: "Impuesto al Valor Agregado 13%", tasa: 0.13 } as const;

/** Unidad (CAT-014: 59) para productos; 99 (otra) para el envío como servicio */
export const UNIDAD = { unidad: 59, otra: 99 } as const;

/** NIT: 14 dígitos (o DUI de 9 en personas naturales). Hacienda lo pide sin guiones. */
export const soloDigitos = (s: string | null | undefined) => String(s ?? "").replace(/\D/g, "");
export const nitValido = (s: string | null | undefined) => /^(\d{14}|\d{9})$/.test(soloDigitos(s));
export const nrcValido = (s: string | null | undefined) => /^\d{1,8}$/.test(soloDigitos(s));
