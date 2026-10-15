import "server-only";

// Leer la factura del proveedor para no digitarla:
// 1) El JSON de la factura electrónica (DTE de Hacienda) trae todo exacto: proveedor, número, fecha,
//    productos, cantidades, precios, si es a crédito y a cuántos días.
// 2) El PDF se lee como texto y se intenta reconocer cada fila; lo que no se entienda se corrige a mano.

export type LineaLeida = { descripcion: string; codigo: string | null; cantidad: number; costo: number };
export type FacturaLeida = {
  origen: "dte_json" | "pdf";
  proveedorNit: string | null;
  proveedorNombre: string | null;
  numero: string | null;
  codigoGeneracion: string | null;
  fecha: string | null; // AAAA-MM-DD
  documento: "ccf" | "factura" | "sin_iva" | null;
  condicion: "contado" | "credito" | null;
  dias: number | null;
  lineas: LineaLeida[];
  total: number | null;
  avisos: string[];
};

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const soloDigitos = (s: unknown) => String(s ?? "").replace(/\D/g, "") || null;

type Dte = {
  identificacion?: { tipoDte?: string; numeroControl?: string; codigoGeneracion?: string; fecEmi?: string };
  emisor?: { nit?: string; nombre?: string; nombreComercial?: string };
  cuerpoDocumento?: { cantidad?: number; codigo?: string | null; descripcion?: string; precioUni?: number; montoDescu?: number }[];
  resumen?: {
    condicionOperacion?: number;
    totalPagar?: number;
    montoTotalOperacion?: number;
    pagos?: { plazo?: string | null; periodo?: number | null }[] | null;
  };
};

/** Factura electrónica (JSON). Acepta el documento solo o envuelto ({ dteJson: … }). */
export function leerDteJson(texto: string): FacturaLeida | null {
  let datos: unknown;
  try {
    datos = JSON.parse(texto.replace(/^﻿/, ""));
  } catch {
    return null;
  }
  const o = datos as Record<string, unknown>;
  const d = (o.dteJson ?? o.documento ?? o.dte ?? o) as Dte;
  if (!d?.identificacion || !Array.isArray(d.cuerpoDocumento)) return null;
  const tipo = d.identificacion.tipoDte;
  const avisos: string[] = [];
  if (tipo && !["01", "03"].includes(tipo)) avisos.push(`El documento es tipo ${tipo} (no es factura ni crédito fiscal). Revisalo.`);
  const pago = d.resumen?.pagos?.find((p) => p?.periodo);
  const multiplo = pago?.plazo === "02" ? 30 : pago?.plazo === "03" ? 365 : 1;
  const credito = d.resumen?.condicionOperacion === 2;
  return {
    origen: "dte_json",
    proveedorNit: soloDigitos(d.emisor?.nit),
    proveedorNombre: d.emisor?.nombreComercial || d.emisor?.nombre || null,
    numero: d.identificacion.numeroControl ?? null,
    codigoGeneracion: d.identificacion.codigoGeneracion?.toUpperCase() ?? null,
    fecha: d.identificacion.fecEmi ?? null,
    // 03 = crédito fiscal (precios sin IVA); 01 = consumidor final (precios con IVA)
    documento: tipo === "03" ? "ccf" : tipo === "01" ? "factura" : null,
    condicion: credito ? "credito" : "contado",
    dias: credito && pago?.periodo ? Number(pago.periodo) * multiplo : credito ? null : 0,
    lineas: d.cuerpoDocumento
      .filter((l) => num(l.cantidad) > 0)
      .map((l) => {
        const cantidad = num(l.cantidad);
        const descuento = num(l.montoDescu);
        return {
          descripcion: String(l.descripcion ?? "").trim(),
          codigo: l.codigo ? String(l.codigo).trim() : null,
          cantidad: Math.round(cantidad),
          // el descuento de la línea se reparte en cada unidad
          costo: Math.round((num(l.precioUni) - descuento / cantidad) * 10000) / 10000,
        };
      }),
    total: num(d.resumen?.totalPagar ?? d.resumen?.montoTotalOperacion) || null,
    avisos,
  };
}

const FECHA = /(\d{1,2})[/-](\d{1,2})[/-](\d{4})|(\d{4})-(\d{2})-(\d{2})/;

const esNumero = (t: string) => /^\$?\d{1,3}(,\d{3})*(\.\d+)?$|^\$?\d+(\.\d+)?$/.test(t);

/**
 * Una fila de productos. Sirve para las dos formas comunes:
 *   "2 UNIDAD SAMSUNG GALAXY A27 NEGRO $150.00 $300.00"
 *   "1 2.00 59 SAMSUNG GALAXY A27 NEGRO 150.00 0.00 0.00 0.00 300.00" (DTE: ítem, cantidad, unidad…)
 * La cantidad × el precio tiene que dar el total de la fila; si no cuadra, la fila no se toma.
 */
function leerFila(l: string): LineaLeida | null {
  const t = l.split(" ");
  let i = 0;
  const inicio: number[] = [];
  while (i < t.length && i < 4 && esNumero(t[i])) inicio.push(num(t[i++]));
  if (!inicio.length) return null;
  const desc: string[] = [];
  while (i < t.length && !esNumero(t[i])) desc.push(t[i++]);
  const montos = t.slice(i).filter(esNumero).map(num);
  const total = [...montos].reverse().find((x) => x > 0);
  if (!total || desc.length === 0) return null;
  const descripcion = desc
    .join(" ")
    .replace(/^(unidad(es)?|und|uds?|c\/u|pza)\s+/i, "")
    .trim();
  if (descripcion.length < 3) return null;
  const cuadra = (q: number, x: number) => x > 0 && Math.abs(q * x - total) <= Math.max(0.05, total * 0.15);
  const cantidades = inicio.filter((x) => Number.isInteger(x) && x > 0 && x <= 9999);
  // Primero una cantidad con un precio unitario distinto del total; si no, 1 unidad al precio total
  const q =
    cantidades.find((c) => c > 1 && montos.some((x) => x !== total && cuadra(c, x))) ??
    (cantidades.includes(1) ? 1 : undefined);
  return q ? { descripcion, codigo: null, cantidad: q, costo: Math.round((total / q) * 10000) / 10000 } : null;
}

/** Texto de un PDF de factura: busca encabezado y filas "cantidad … descripción … precio … total". */
export function leerTextoFactura(texto: string): FacturaLeida {
  const lineasTexto = texto
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const todo = lineasTexto.join("\n");
  const buscar = (re: RegExp) => todo.match(re)?.[1]?.trim() ?? null;

  const numeroControl = buscar(/(DTE-\d{2}-[A-Z0-9]{8}-\d{15})/i);
  const codigo = buscar(/([0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12})/i);
  const nit = buscar(/NIT[:\s]*([\d-]{14,17})/i);
  const f = todo.match(FECHA);
  const fecha = f ? (f[4] ? `${f[4]}-${f[5]}-${f[6]}` : `${f[3]}-${f[2].padStart(2, "0")}-${f[1].padStart(2, "0")}`) : null;
  const credito = /cr[eé]dito\s*(?:a\s*)?(\d{1,3})\s*d[ií]as/i.exec(todo) ?? /plazo[:\s]*(\d{1,3})\s*d[ií]as/i.exec(todo);
  const esCredito = Boolean(credito) || /condici[oó]n[^\n]{0,20}cr[eé]dito/i.test(todo);
  const esCcf = /cr[eé]dito\s+fiscal|DTE-03-/i.test(todo);
  const esFactura = /consumidor\s+final|DTE-01-/i.test(todo);

  const lineas: LineaLeida[] = [];
  for (const l of lineasTexto) {
    const fila = leerFila(l);
    if (fila) lineas.push(fila);
  }
  const totalTexto = buscar(/total\s*a\s*pagar[:\s]*\$?\s*([\d,]+\.\d{2})/i);
  return {
    origen: "pdf",
    proveedorNit: nit ? nit.replace(/\D/g, "") : null,
    proveedorNombre: null,
    numero: numeroControl,
    codigoGeneracion: codigo?.toUpperCase() ?? null,
    fecha,
    documento: esCcf ? "ccf" : esFactura ? "factura" : null,
    condicion: esCredito ? "credito" : null,
    dias: credito ? Number(credito[1]) : null,
    lineas,
    total: totalTexto ? num(totalTexto) : null,
    avisos: lineas.length
      ? ["Se leyó el PDF como texto: revisá cada línea antes de recibir."]
      : ["No se reconocieron productos en el PDF. Si tenés el archivo .json de la factura electrónica, subilo: se lee exacto. Si no, agregá las líneas a mano."],
  };
}

/** Texto del PDF ordenado en filas (agrupa por altura en la página y ordena de izquierda a derecha) */
export async function leerPdf(datos: ArrayBuffer): Promise<string> {
  const { getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(datos));
  const filas: string[] = [];
  for (let n = 1; n <= Math.min(pdf.numPages, 10); n++) {
    const pagina = await pdf.getPage(n);
    const contenido = await pagina.getTextContent();
    const porAltura = new Map<number, { x: number; t: string }[]>();
    for (const item of contenido.items as { str?: string; transform?: number[] }[]) {
      if (!item.str?.trim() || !item.transform) continue;
      const y = Math.round(item.transform[5] / 3) * 3;
      const lista = porAltura.get(y) ?? [];
      lista.push({ x: item.transform[4], t: item.str.trim() });
      porAltura.set(y, lista);
    }
    for (const y of [...porAltura.keys()].sort((a, b) => b - a)) {
      filas.push(
        porAltura
          .get(y)!
          .sort((a, b) => a.x - b.x)
          .map((i) => i.t)
          .join(" ")
      );
    }
  }
  return filas.join("\n");
}
