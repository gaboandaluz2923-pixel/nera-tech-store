// Lectura de tablas de proveedores: CSV, texto pegado desde Excel, y detección de columnas.
// Puro (sin dependencias): la lectura de .xlsx se hace en el navegador con read-excel-file
// y el resultado (filas de texto) entra aquí igual que un CSV.

export type Tabla = string[][];

export type Mapeo = {
  filaEncabezado: number; // índice de la fila de encabezados (-1 si no hay)
  descripcion: number;
  precio: number;
  stock: number | null;
  sku: number | null;
  precioSugerido: number | null;
};

export type LineaCruda = {
  sku: string | null;
  descripcion: string;
  precio: number;
  stock: number | null;
  precioSugerido: number | null;
};

// ---------- CSV / texto pegado ----------
export function leerTexto(texto: string): Tabla {
  const limpio = texto.replace(/^﻿/, "");
  const primera = limpio.split(/\r?\n/).find((l) => l.trim()) ?? "";
  const separador = primera.includes("\t")
    ? "\t"
    : (primera.match(/;/g)?.length ?? 0) > (primera.match(/,/g)?.length ?? 0)
      ? ";"
      : ",";
  const filas: Tabla = [];
  let fila: string[] = [];
  let celda = "";
  let comillas = false;
  for (let i = 0; i < limpio.length; i++) {
    const ch = limpio[i];
    if (comillas) {
      if (ch === '"' && limpio[i + 1] === '"') {
        celda += '"';
        i++;
      } else if (ch === '"') comillas = false;
      else celda += ch;
    } else if (ch === '"' && celda === "") comillas = true;
    else if (ch === separador) {
      fila.push(celda);
      celda = "";
    } else if (ch === "\n") {
      fila.push(celda);
      filas.push(fila);
      fila = [];
      celda = "";
    } else if (ch !== "\r") celda += ch;
  }
  if (celda || fila.length) {
    fila.push(celda);
    filas.push(fila);
  }
  return filas.map((f) => f.map((c) => c.trim())).filter((f) => f.some((c) => c));
}

// ---------- números ----------
export function aNumero(s: string | null | undefined): number | null {
  if (s === null || s === undefined) return null;
  const t = String(s).replace(/[$\s]/g, "").replace(/USD/i, "");
  if (!t) return null;
  // "1,149.00" → 1149 ; "1.149,00" → 1149 ; "314.40" → 314.4
  let n = t;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) n = t.replace(/\./g, "").replace(",", ".");
  else n = t.replace(/,/g, "");
  const v = Number(n);
  return Number.isFinite(v) ? v : null;
}

const pareceMoneda = (s: string) => /^\$?\s*\d{1,3}(,?\d{3})*(\.\d{1,2})?$/.test(s.replace(/\s/g, "")) && /\d/.test(s);

// ---------- detección de columnas ----------
const ENC = {
  descripcion: /(descrip|existencia|producto|nombre|articulo|item|smartphones|modelo)/i,
  precio: /(precio|price|costo|especial|p\.\s*esp|valor)/i,
  sugerido: /(sugerid|pvp|retail|publico)/i,
  stock: /(cantidad|stock|exist|qty|inventario|disp)/i,
  sku: /(codigo|código|sku|unidad|item|cod\.?|part)/i,
};

export function detectarColumnas(tabla: Tabla): Mapeo {
  const ancho = Math.max(...tabla.map((f) => f.length));
  // Fila de encabezado: la primera de las 10 primeras con un texto que parezca encabezado de precio
  let filaEncabezado = -1;
  for (let i = 0; i < Math.min(10, tabla.length); i++) {
    if (tabla[i].some((c) => ENC.precio.test(c) && !pareceMoneda(c))) {
      filaEncabezado = i;
      break;
    }
  }
  const datos = tabla.slice(filaEncabezado + 1).slice(0, 200);
  const encabezado = filaEncabezado >= 0 ? tabla[filaEncabezado] : [];

  const stats = Array.from({ length: ancho }, (_, c) => {
    const vals = datos.map((f) => f[c] ?? "").filter(Boolean);
    const conDolar = vals.filter((v) => v.includes("$")).length;
    const numericos = vals.filter((v) => aNumero(v) !== null).length;
    const largo = vals.reduce((s, v) => s + v.length, 0) / Math.max(1, vals.length);
    return { c, n: vals.length, conDolar, numericos, largo, enc: encabezado[c] ?? "" };
  });

  // Descripción: la columna de texto más larga (prefiriendo encabezado que coincida)
  const textos = stats.filter((s) => s.n > 0 && s.numericos < s.n * 0.5);
  const descripcion =
    textos.find((s) => ENC.descripcion.test(s.enc) && s.largo > 12)?.c ??
    [...textos].sort((a, b) => b.largo - a.largo)[0]?.c ??
    0;

  const numericas = stats.filter((s) => s.c !== descripcion && s.n > 0 && s.numericos >= s.n * 0.6);
  const sugerido = numericas.find((s) => ENC.sugerido.test(s.enc))?.c ?? null;
  const precio =
    numericas.find((s) => s.c !== sugerido && ENC.precio.test(s.enc) && !ENC.sugerido.test(s.enc))?.c ??
    numericas.filter((s) => s.c !== sugerido).sort((a, b) => b.conDolar - a.conDolar || b.c - a.c)[0]?.c ??
    descripcion + 1;

  const stock =
    numericas.find(
      (s) => s.c !== precio && s.c !== sugerido && ENC.stock.test(s.enc) && s.conDolar === 0
    )?.c ??
    numericas.find((s) => s.c !== precio && s.c !== sugerido && s.conDolar === 0 && s.c < precio)?.c ??
    null;

  const sku =
    stats.find(
      (s) =>
        s.c !== descripcion &&
        s.c !== precio &&
        s.c !== stock &&
        s.c !== sugerido &&
        ENC.sku.test(s.enc) &&
        s.largo < 15
    )?.c ?? null;

  return { filaEncabezado, descripcion, precio, stock, sku, precioSugerido: sugerido };
}

export function extraerLineas(tabla: Tabla, m: Mapeo): LineaCruda[] {
  const lineas: LineaCruda[] = [];
  for (const f of tabla.slice(m.filaEncabezado + 1)) {
    const descripcion = (f[m.descripcion] ?? "").replace(/\s+/g, " ").trim();
    const precio = aNumero(f[m.precio]);
    // Filas de sección ("SMARTPHONE SAMSUNG") o vacías no tienen precio: se saltan
    if (!descripcion || precio === null || precio <= 0) continue;
    if (aNumero(descripcion) !== null) continue;
    lineas.push({
      descripcion,
      precio,
      stock: m.stock === null ? null : Math.round(aNumero(f[m.stock]) ?? 0),
      sku: m.sku === null ? null : (f[m.sku] ?? "").trim() || null,
      precioSugerido: m.precioSugerido === null ? null : aNumero(f[m.precioSugerido]),
    });
  }
  return lineas;
}
