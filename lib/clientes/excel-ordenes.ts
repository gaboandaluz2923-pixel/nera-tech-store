// Clientes que compraron antes de la tienda (Excel "Pedidos e Inventario", pestaña ORDENES).
// Puro (sin base de datos): se usa en el navegador para mostrar el resumen y en el servidor para importar.

/** Etiqueta en el CRM de quienes compraron antes de la tienda */
export const ETIQUETA_HISTORIAL = "cliente anterior";

export type FilaOrden = {
  numero: number | null;
  fecha: string | null; // AAAA-MM-DD
  nombre: string;
  direccion: string | null;
  telefonos: string[]; // 8 dígitos
  correo: string | null;
  pedido: string | null;
  bundle: string | null;
  capacidad: string | null;
  formaPago: string | null;
  total: number | null;
  envio: string | null;
  estado: string | null;
  notas: string | null;
};

export type Persona = {
  clave: string;
  nombre: string;
  telefonos: string[];
  correo: string | null;
  direccion: string | null;
  compras: FilaOrden[];
};

const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const enc = (s: unknown) => sinAcentos(String(s ?? "")).toLowerCase().replace(/\s+/g, " ").trim();
const limpio = (v: unknown) => {
  const s = String(v ?? "").replace(/\s+/g, " ").trim();
  return s && s.toLowerCase() !== "null" ? s : null;
};

/** "Ingrid estefani salvador" → "Ingrid Estefani Salvador" (sin tocar lo que ya viene con mayúsculas) */
export function nombrePropio(s: string) {
  return s
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((p) => (["de", "del", "la", "las", "los", "y"].includes(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(" ")
    .replace(/^./, (c) => c.toUpperCase());
}

/** "7035-9224 / 6420 5778" → ["70359224", "64205778"]. Solo números de El Salvador (8 dígitos, 2/6/7). */
export function telefonosDe(v: unknown): string[] {
  const d = String(v ?? "").replace(/\D/g, "").replace(/^503(?=\d{8}(\d{8})?$)/, "");
  const partes = d.length === 16 ? [d.slice(0, 8), d.slice(8)] : d.length === 8 ? [d] : (String(v ?? "").match(/\d[\d\s-]{6,}\d/g) ?? []).map((x) => x.replace(/\D/g, "").replace(/^503(?=\d{8}$)/, ""));
  return [...new Set(partes.filter((x) => /^[267]\d{7}$/.test(x)))];
}

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** "07022025 -1" → "2025-02-07"; también acepta fechas de Excel */
function fechaDe(v: unknown): string | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const m = String(v ?? "").match(/(\d{2})(\d{2})(\d{4})/);
  if (!m) return null;
  const [, d, mes, a] = m;
  if (Number(mes) < 1 || Number(mes) > 12 || Number(d) < 1 || Number(d) > 31) return null;
  return `${a}-${mes}-${d}`;
}

const COLUMNAS = {
  numero: ["#"],
  fecha: ["codigo / fecha", "codigo", "fecha"],
  nombre: ["nombre del cliente", "nombre", "cliente"],
  direccion: ["direccion"],
  telefono: ["telefono", "tel", "celular"],
  correo: ["correo", "email", "e-mail"],
  pedido: ["pedido", "producto"],
  bundle: ["bundle"],
  capacidad: ["capacidad"],
  formaPago: ["forma de pago", "pago"],
  total: ["total"],
  envio: ["tipo de envio", "envio"],
  estado: ["estado"],
  notas: ["notas", "nota"],
} as const;

/** Tabla (filas de celdas) → órdenes. Busca la fila de encabezados en las primeras 10. */
export function leerOrdenes(tabla: unknown[][]): FilaOrden[] {
  const i = tabla.slice(0, 10).findIndex((f) => {
    const t = f.map(enc);
    return t.includes("nombre del cliente") || (t.some((x) => x.startsWith("nombre")) && t.some((x) => x.startsWith("telefono")));
  });
  if (i < 0) throw new Error("No encontré los encabezados (Nombre del cliente, Telefono…) en la pestaña ORDENES.");
  const encabezados = tabla[i].map(enc);
  const col = (k: keyof typeof COLUMNAS) => {
    for (const nombre of COLUMNAS[k]) {
      const j = encabezados.indexOf(nombre);
      if (j >= 0) return j;
    }
    return -1;
  };
  const idx = Object.fromEntries(Object.keys(COLUMNAS).map((k) => [k, col(k as keyof typeof COLUMNAS)])) as Record<keyof typeof COLUMNAS, number>;
  const celda = (f: unknown[], k: keyof typeof COLUMNAS) => (idx[k] >= 0 ? f[idx[k]] : null);

  return tabla
    .slice(i + 1)
    .map((f) => {
      const correo = limpio(celda(f, "correo"))?.toLowerCase().replace(/\s/g, "") ?? null;
      const total = Number(String(celda(f, "total") ?? "").replace(/[$,\s]/g, ""));
      return {
        numero: Number(celda(f, "numero")) || null,
        fecha: fechaDe(celda(f, "fecha")),
        nombre: nombrePropio(limpio(celda(f, "nombre")) ?? ""),
        direccion: limpio(celda(f, "direccion"))?.slice(0, 300) ?? null,
        telefonos: telefonosDe(celda(f, "telefono")),
        correo: correo && CORREO.test(correo) ? correo : null,
        pedido: limpio(celda(f, "pedido")),
        bundle: limpio(celda(f, "bundle")),
        capacidad: limpio(celda(f, "capacidad")),
        formaPago: limpio(celda(f, "formaPago")),
        total: Number.isFinite(total) && total > 0 ? Math.round(total * 100) / 100 : null,
        envio: limpio(celda(f, "envio")),
        estado: limpio(celda(f, "estado")),
        notas: limpio(celda(f, "notas")),
      };
    })
    .filter((o) => o.nombre || o.telefonos.length || o.correo);
}

/** Une las órdenes de la misma persona (mismo teléfono o mismo correo). */
export function agruparPersonas(ordenes: FilaOrden[]): Persona[] {
  const padre = ordenes.map((_, i) => i);
  const raiz = (i: number): number => (padre[i] === i ? i : (padre[i] = raiz(padre[i])));
  const vistos = new Map<string, number>();
  ordenes.forEach((o, i) => {
    for (const k of [...o.telefonos.map((t) => `t:${t}`), ...(o.correo ? [`c:${o.correo}`] : [])]) {
      const j = vistos.get(k);
      if (j === undefined) vistos.set(k, i);
      else padre[raiz(i)] = raiz(j);
    }
  });
  const grupos = new Map<number, FilaOrden[]>();
  ordenes.forEach((o, i) => {
    if (!o.telefonos.length && !o.correo) return; // sin cómo contactarlo no sirve para el CRM
    const r = raiz(i);
    grupos.set(r, [...(grupos.get(r) ?? []), o]);
  });
  return [...grupos.values()].map((compras) => {
    // Lo más reciente manda (el Excel va en orden de fecha)
    const recientes = [...compras].reverse();
    const telefonos = [...new Set(recientes.flatMap((c) => c.telefonos))];
    const correo = recientes.find((c) => c.correo)?.correo ?? null;
    return {
      clave: telefonos[0] ? `t:${telefonos[0]}` : `c:${correo}`,
      nombre: recientes.find((c) => c.nombre)?.nombre || "Cliente",
      telefonos,
      correo,
      direccion: recientes.find((c) => c.direccion)?.direccion ?? null,
      compras,
    };
  });
}

/** Marca para no repetir la nota si se importa dos veces */
export const marcaNota = (o: FilaOrden) => `[Excel #${o.numero ?? "?"}${o.fecha ? ` ${o.fecha}` : ""}]`;

const BANCO: [RegExp, string][] = [
  [/^(a|agr[ií]cola)$/i, "Banco Agrícola"],
  [/^(c|cusca|cuscatl[aá]n)$/i, "Cuscatlán"],
  [/^bac$/i, "BAC"],
];

/** "Tasa 0 - BAC" → "tasa 0% (BAC)"; "Trasferencia" → "transferencia"; "Si" → "pagado (sin detalle)" */
export function formaDePago(v: string | null): string | null {
  if (!v) return null;
  const t = v.trim();
  if (/^s[ií]$/i.test(t)) return "pagado (sin detalle)";
  if (/^no$/i.test(t)) return null;
  if (/efectivo/i.test(t) && /tasa/i.test(t)) return "tasa 0% y efectivo";
  if (/^efectivo/i.test(t)) return "efectivo contra entrega";
  if (/^tra\w*fer/i.test(t)) return "transferencia";
  const m = t.match(/^(tasa\s*0|tarjeta[^-]*)\s*[-–/]?\s*(.*)$/i);
  if (m) {
    const banco = BANCO.find(([re]) => re.test(m[2].trim()))?.[1] ?? (m[2].trim() || null);
    const forma = /^tasa/i.test(m[1]) ? "tasa 0%" : "tarjeta";
    return banco ? `${forma} (${banco})` : forma;
  }
  return t.toLowerCase();
}

export function notaCompra(o: FilaOrden): string {
  const fecha = o.fecha ? o.fecha.split("-").reverse().join("/") : "sin fecha";
  const pago = formaDePago(o.formaPago);
  return [
    `Compra anterior (${fecha}): ${[o.pedido, o.capacidad].filter(Boolean).join(" ") || "producto sin anotar"}`,
    o.bundle ? `combo: ${o.bundle}` : "",
    o.total !== null ? `pagó $${o.total.toFixed(2)}` : "",
    pago ? `forma de pago: ${pago}` : "",
    o.envio ? `envío: ${o.envio}` : "",
    o.estado ? `estado: ${o.estado}` : "",
    o.notas ? `nota: ${o.notas}` : "",
  ]
    .filter(Boolean)
    .join(" · ")
    .concat(` ${marcaNota(o)}`);
}
