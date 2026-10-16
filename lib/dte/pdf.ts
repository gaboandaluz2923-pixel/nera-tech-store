import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import { NOMBRE_FORMA_PAGO, TIPO_DOCUMENTO_ID, nombreActividad, textoDireccion, type DireccionMH } from "./catalogos";

// Representación gráfica del DTE (Normativa 2.0, regla 1.10): versión legible en PDF con los nombres de
// campo de los anexos, el sello de recepción y el código QR de consulta pública de Hacienda.
// En el ambiente de pruebas lleva la advertencia "sin valor legal".

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export type DatosPdf = {
  json: Json;
  selloRecibido: string | null;
  estado: string;
  /** Pie: dónde el cliente puede volver a descargarlo (opcional) */
  enlace?: string | null;
};

const TITULO: Record<string, string> = {
  "01": "FACTURA",
  "03": "COMPROBANTE DE CRÉDITO FISCAL",
  "05": "NOTA DE CRÉDITO",
};

export const urlConsultaPublica = (ambiente: string, codigoGeneracion: string, fecEmi: string) =>
  `https://admin.factura.gob.sv/consultaPublica?ambiente=${ambiente}&codGen=${codigoGeneracion}&fechaEmi=${fecEmi}`;

const PERMITIDOS = new Set("“”‘’–—•…€".split(""));
/** Las fuentes estándar del PDF solo traen el alfabeto latino (WinAnsi): se limpian los demás caracteres */
function limpio(s: unknown): string {
  return Array.from(String(s ?? ""))
    .map((c) => {
      if (c.charCodeAt(0) <= 255 || PERMITIDOS.has(c)) return c === "\t" ? " " : c;
      const base = c.normalize("NFD").replace(/[̀-ͯ]/g, "");
      return base.charCodeAt(0) <= 255 ? base : c === "×" ? "x" : "";
    })
    .join("")
    .replace(/[\r\n]+/g, " ");
}

const usd = (n: number) => `$${Number(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const cantidad = (n: number) => (Number.isInteger(n) ? String(n) : String(Number(n.toFixed(4))));

function partir(texto: string, fuente: PDFFont, tamano: number, ancho: number): string[] {
  const palabras = limpio(texto).split(/\s+/).filter(Boolean);
  const lineas: string[] = [];
  let actual = "";
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p;
    if (fuente.widthOfTextAtSize(prueba, tamano) <= ancho) {
      actual = prueba;
    } else {
      if (actual) lineas.push(actual);
      // palabra más larga que el ancho: se corta
      let resto = p;
      while (fuente.widthOfTextAtSize(resto, tamano) > ancho && resto.length > 1) {
        let i = resto.length;
        while (i > 1 && fuente.widthOfTextAtSize(resto.slice(0, i), tamano) > ancho) i--;
        lineas.push(resto.slice(0, i));
        resto = resto.slice(i);
      }
      actual = resto;
    }
  }
  if (actual) lineas.push(actual);
  return lineas.length ? lineas : [""];
}

export async function pdfDte(d: DatosPdf): Promise<Uint8Array> {
  const j = d.json;
  const id = j.identificacion ?? {};
  const tipo = String(id.tipoDte ?? "");
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${TITULO[tipo] ?? "DTE"} ${id.numeroControl ?? ""}`);
  pdf.setAuthor(limpio(j.emisor?.nombre ?? ""));
  pdf.setCreator("Nera Tech");
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ANCHO = 612;
  const ALTO = 792;
  const M = 36;
  const util = ANCHO - 2 * M;
  const gris = rgb(0.42, 0.42, 0.45);
  const linea = rgb(0.85, 0.85, 0.88);
  const marca = rgb(0.06, 0.09, 0.16);

  let pagina: PDFPage = pdf.addPage([ANCHO, ALTO]);
  let y = ALTO - M;

  const texto = (s: string, x: number, yy: number, o: { t?: number; f?: PDFFont; c?: ReturnType<typeof rgb>; derecha?: number } = {}) => {
    const t = o.t ?? 8;
    const f = o.f ?? normal;
    const v = limpio(s);
    const xx = o.derecha !== undefined ? o.derecha - f.widthOfTextAtSize(v, t) : x;
    pagina.drawText(v, { x: xx, y: yy, size: t, font: f, color: o.c ?? marca });
  };
  const nuevaPagina = () => {
    pagina = pdf.addPage([ANCHO, ALTO]);
    y = ALTO - M;
  };
  const espacio = (alto: number) => {
    if (y - alto < M + 30) nuevaPagina();
  };

  // Aviso de pruebas / invalidado
  if (id.ambiente === "00") {
    pagina.drawRectangle({ x: M, y: y - 16, width: util, height: 18, color: rgb(1, 0.93, 0.85) });
    texto("AMBIENTE DE PRUEBAS — DOCUMENTO SIN VALOR LEGAL", M + 6, y - 11, { f: negrita, t: 9, c: rgb(0.7, 0.25, 0) });
    y -= 24;
  }
  if (d.estado === "invalidado") {
    pagina.drawRectangle({ x: M, y: y - 16, width: util, height: 18, color: rgb(1, 0.9, 0.9) });
    texto("DOCUMENTO INVALIDADO ANTE EL MINISTERIO DE HACIENDA", M + 6, y - 11, { f: negrita, t: 9, c: rgb(0.7, 0, 0) });
    y -= 24;
  }

  // Encabezado
  texto("DOCUMENTO TRIBUTARIO ELECTRÓNICO", M, y - 10, { f: negrita, t: 9, c: gris });
  texto(TITULO[tipo] ?? `DTE ${tipo}`, M, y - 26, { f: negrita, t: 16 });
  texto(limpio(j.emisor?.nombreComercial || j.emisor?.nombre || ""), 0, y - 10, { f: negrita, t: 11, derecha: ANCHO - M });
  y -= 40;

  // Identificación + QR
  const contingencia = Number(id.tipoOperacion) === 2;
  const ident: [string, string][] = [
    ["Código de generación", String(id.codigoGeneracion ?? "")],
    ["Número de control", String(id.numeroControl ?? "")],
    ["Sello de recepción", d.selloRecibido ?? (contingencia ? "Pendiente (emitido en contingencia)" : "Pendiente")],
    ["Modelo de facturación", Number(id.tipoModelo) === 2 ? "Diferido" : "Previo"],
    ["Tipo de transmisión", contingencia ? "Contingencia" : "Normal"],
    ["Fecha y hora de generación", `${String(id.fecEmi ?? "").split("-").reverse().join("/")} ${id.horEmi ?? ""}`],
  ];
  const altoIdent = ident.length * 13 + 10;
  pagina.drawRectangle({ x: M, y: y - altoIdent, width: util, height: altoIdent, borderColor: linea, borderWidth: 1 });
  let yi = y - 14;
  for (const [k, v] of ident) {
    texto(k, M + 8, yi, { c: gris });
    texto(v, M + 130, yi, { f: negrita, t: k === "Sello de recepción" ? 7.5 : 8 });
    yi -= 13;
  }
  const qr = await QRCode.toBuffer(urlConsultaPublica(String(id.ambiente), String(id.codigoGeneracion), String(id.fecEmi)), {
    margin: 0,
    width: 240,
    errorCorrectionLevel: "M",
  });
  const imagen = await pdf.embedPng(qr);
  const lado = altoIdent - 12;
  pagina.drawImage(imagen, { x: ANCHO - M - lado - 6, y: y - altoIdent + 6, width: lado, height: lado });
  y -= altoIdent + 12;

  // Emisor y receptor
  const e = j.emisor ?? {};
  const r = j.receptor ?? null;
  const fila = (k: string, v: unknown): [string, string] => [k, v === null || v === undefined || v === "" ? "–" : String(v)];
  const nit = (s: string) => (s && s.length === 14 ? `${s.slice(0, 4)}-${s.slice(4, 10)}-${s.slice(10, 13)}-${s.slice(13)}` : s);
  const colE: [string, string][] = [
    fila("Nombre o razón social", e.nombre),
    fila("NIT", nit(e.nit)),
    fila("NRC", e.nrc),
    fila("Actividad económica", e.descActividad),
    fila("Dirección", textoDireccion(e.direccion as DireccionMH)),
    fila("Teléfono", e.telefono),
    fila("Correo", e.correo),
    fila("Nombre comercial", e.nombreComercial),
  ];
  const docReceptor = r
    ? r.nit
      ? `NIT ${nit(r.nit)}`
      : r.numDocumento
        ? `${TIPO_DOCUMENTO_ID[r.tipoDocumento] ?? "Documento"} ${r.tipoDocumento === "36" ? nit(r.numDocumento) : r.numDocumento}`
        : null
    : null;
  const colR: [string, string][] = r
    ? [
        fila("Nombre o razón social", r.nombre),
        fila("Documento de identificación", docReceptor),
        ...(tipo !== "01" ? [fila("NRC", r.nrc), fila("Actividad económica", r.descActividad ?? nombreActividad(r.codActividad))] : []),
        fila("Dirección", r.direccion ? textoDireccion(r.direccion as DireccionMH) : null),
        fila("Teléfono", r.telefono),
        fila("Correo", r.correo),
      ]
    : [fila("Receptor", "Consumidor final")];
  const mitad = (util - 12) / 2;
  const bloque = (titulo: string, filas: [string, string][], x: number) => {
    let yy = y;
    texto(titulo, x, yy - 9, { f: negrita, t: 9 });
    yy -= 22;
    for (const [k, v] of filas) {
      texto(k, x, yy, { t: 6.5, c: gris });
      yy -= 9;
      for (const l of partir(v, normal, 8, mitad)) {
        texto(l, x, yy);
        yy -= 10;
      }
      yy -= 2;
    }
    return yy;
  };
  const yE = bloque("EMISOR", colE, M);
  const yR = bloque("RECEPTOR", colR, M + mitad + 12);
  y = Math.min(yE, yR) - 6;

  // Documentos relacionados (nota de crédito)
  if (Array.isArray(j.documentoRelacionado) && j.documentoRelacionado.length) {
    espacio(40);
    texto("DOCUMENTOS RELACIONADOS", M, y, { f: negrita, t: 9 });
    y -= 13;
    for (const dr of j.documentoRelacionado) {
      texto(
        `${dr.tipoDocumento === "03" ? "Comprobante de crédito fiscal" : `Tipo ${dr.tipoDocumento}`} · ${dr.tipoGeneracion === 2 ? "Electrónico" : "Físico"} · ${dr.numeroDocumento} · ${String(dr.fechaEmision).split("-").reverse().join("/")}`,
        M,
        y
      );
      y -= 12;
    }
    y -= 4;
  }

  // Cuerpo del documento
  const cols = [
    { k: "N°", w: 22 },
    { k: "Cantidad", w: 44 },
    { k: "Descripción", w: util - 22 - 44 - 70 - 60 - 70 },
    { k: tipo === "01" ? "Precio unitario" : "Precio unitario (sin IVA)", w: 70 },
    { k: "Descuento", w: 60 },
    { k: "Ventas gravadas", w: 70 },
  ];
  const encabezado = () => {
    pagina.drawRectangle({ x: M, y: y - 14, width: util, height: 16, color: rgb(0.95, 0.95, 0.97) });
    let x = M + 4;
    cols.forEach((c, i) => {
      if (i >= 3) texto(c.k, 0, y - 9, { f: negrita, t: 7, derecha: x + c.w - 4 });
      else texto(c.k, x, y - 9, { f: negrita, t: 7 });
      x += c.w;
    });
    y -= 20;
  };
  espacio(40);
  encabezado();
  for (const it of (j.cuerpoDocumento ?? []) as Json[]) {
    const desc = partir(String(it.descripcion ?? ""), normal, 8, cols[2].w - 6);
    const alto = desc.length * 10 + 4;
    if (y - alto < M + 30) {
      nuevaPagina();
      encabezado();
    }
    let x = M + 4;
    const valores = [String(it.numItem), cantidad(Number(it.cantidad)), "", usd(it.precioUni), usd(it.montoDescu), usd(it.ventaGravada)];
    cols.forEach((c, i) => {
      if (i === 2) desc.forEach((l, k) => texto(l, x, y - k * 10));
      else if (i >= 3) texto(valores[i], 0, y, { derecha: x + c.w - 4 });
      else texto(valores[i], x, y);
      x += c.w;
    });
    y -= alto;
    pagina.drawLine({ start: { x: M, y: y + 6 }, end: { x: M + util, y: y + 6 }, thickness: 0.5, color: linea });
  }
  y -= 6;

  // Resumen
  const s = j.resumen ?? {};
  const resumen: [string, string, boolean?][] = [];
  resumen.push(["Suma de ventas gravadas", usd(s.totalGravada)]);
  if (Number(s.totalDescu) > 0) resumen.push(["Total de descuentos (incluidos arriba)", usd(s.totalDescu)]);
  if (Array.isArray(s.tributos)) for (const t of s.tributos) resumen.push([String(t.descripcion), usd(t.valor)]);
  if (s.subTotal !== undefined) resumen.push(["Sub-total", usd(s.subTotal)]);
  if (Number(s.ivaPerci) > 0) resumen.push(["IVA percibido", usd(s.ivaPerci)]);
  if (Number(s.ivaRete) > 0) resumen.push(["IVA retenido", `-${usd(s.ivaRete)}`]);
  resumen.push(["Monto total de la operación", usd(s.montoTotalOperacion)]);
  if (tipo === "01") resumen.push(["IVA incluido en el total", usd(s.totalIva)]);
  resumen.push(["Total a pagar", usd(s.totalPagar), true]);
  espacio(resumen.length * 13 + 60);
  const xr = M + util - 230;
  for (const [k, v, fuerte] of resumen) {
    texto(k, xr, y, { f: fuerte ? negrita : normal, t: fuerte ? 10 : 8 });
    texto(v, 0, y, { f: fuerte ? negrita : normal, t: fuerte ? 10 : 8, derecha: M + util });
    y -= fuerte ? 15 : 12;
  }
  // A la izquierda: letras, condición, pagos, observaciones
  let yl = y + resumen.length * 12 + 3;
  const izquierda = (k: string, v: string) => {
    texto(k, M, yl, { t: 6.5, c: gris });
    yl -= 9;
    for (const l of partir(v, normal, 8, util - 250)) {
      texto(l, M, yl);
      yl -= 10;
    }
    yl -= 2;
  };
  if (s.totalLetras) izquierda("Total en letras", String(s.totalLetras));
  if (s.condicionOperacion) izquierda("Condición de la operación", Number(s.condicionOperacion) === 2 ? "A crédito" : Number(s.condicionOperacion) === 3 ? "Otro" : "Contado");
  if (Array.isArray(s.pagos) && s.pagos.length)
    izquierda(
      "Forma de pago",
      (s.pagos as Json[]).map((p) => `${NOMBRE_FORMA_PAGO[p.codigo] ?? p.codigo} ${usd(p.montoPago)}${p.referencia ? ` (ref. ${p.referencia})` : ""}`).join(" · ")
    );
  if (s.observaciones) izquierda("Observaciones", String(s.observaciones));
  y = Math.min(y, yl) - 8;

  // Pie en todas las páginas
  const pie = `Consultá la validez de este documento en admin.factura.gob.sv con el código de generación${d.enlace ? ` · Descargalo de nuevo en ${d.enlace}` : ""}`;
  pdf.getPages().forEach((pg, i, todas) => {
    pg.drawLine({ start: { x: M, y: M + 14 }, end: { x: ANCHO - M, y: M + 14 }, thickness: 0.5, color: linea });
    const lineasPie = partir(pie, normal, 6.5, util - 60);
    lineasPie.forEach((l, k) => pg.drawText(l, { x: M, y: M + 4 - k * 8, size: 6.5, font: normal, color: gris }));
    const n = `Página ${i + 1} de ${todas.length}`;
    pg.drawText(n, { x: ANCHO - M - normal.widthOfTextAtSize(n, 6.5), y: M + 4, size: 6.5, font: normal, color: gris });
  });
  return pdf.save();
}

/** Archivo DTE para entregar: el JSON con la firma y el sello (Normativa 2.0, regla 1.9). */
export function archivoDte(json: Json, firma: string | null, sello: string | null): string {
  return JSON.stringify({ ...json, firmaElectronica: firma ?? "", selloRecibido: sello });
}
