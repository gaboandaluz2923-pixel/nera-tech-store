import { IVA, UNIDAD, nombreDistrito, VERSION_CONTINGENCIA, VERSION_DTE, VERSION_INVALIDACION, soloDigitos, type DireccionMH, type TipoDte } from "./catalogos";
import { montoEnLetras, r2, r8 } from "./montos";

// Arma el JSON de cada documento según los esquemas oficiales (Normativa de cumplimiento 2.0):
// Factura (01, v2), Crédito fiscal (03, v4), Nota de crédito (05, v4), Invalidación (v3) y Contingencia (v4).
// Son funciones puras: reciben los datos y devuelven el documento, sin base de datos ni red.

export type Emisor = {
  nit: string;
  nrc: string;
  nombre: string;
  nombreComercial: string | null;
  codActividad: string;
  descActividad: string;
  direccion: DireccionMH;
  telefono: string;
  correo: string;
  /** Código que asignó Hacienda al establecimiento (número de control y eventos): M001, S001, B001 o P001 */
  codEstable: string;
  /** Código que asignó Hacienda al punto de venta: P001 */
  codPuntoVenta: string;
  /** CAT-009: 02 casa matriz */
  tipoEstablecimiento: string;
  responsable: { nombre: string; tipoDoc: string; numDoc: string };
};

/** Una línea de la venta con precios CON IVA, como se cobran en la tienda. */
export type LineaVenta = {
  codigo: string | null;
  descripcion: string;
  cantidad: number;
  /** precio unitario con IVA */
  precio: number;
  /** descuento total de la línea con IVA */
  descuento: number;
  /** 1 bien, 2 servicio (CAT-011) */
  tipoItem: 1 | 2;
  uniMedida: number;
};

export type Pago = { codigo: string; monto: number; referencia: string | null };

export type Identificacion = {
  ambiente: "00" | "01";
  numeroControl: string;
  codigoGeneracion: string;
  fecEmi: string; // AAAA-MM-DD
  horEmi: string; // HH:MM:SS
  /** contingencia: tipo (CAT-005) y motivo; null = transmisión normal */
  contingencia?: { tipo: number; motivo: string | null } | null;
};

export type ReceptorFactura = {
  nombre: string | null;
  tipoDocumento: string | null; // CAT-022
  numDocumento: string | null;
  telefono: string | null;
  correo: string | null;
  direccion: DireccionMH | null;
};

export type ReceptorFiscal = {
  nit: string;
  nrc: string;
  nombre: string;
  nombreComercial: string | null;
  codActividad: string;
  descActividad: string;
  direccion: DireccionMH;
  telefono: string | null;
  correo: string | null;
};

const nulo = (s: string | null | undefined) => {
  const t = String(s ?? "").trim();
  return t ? t : null;
};
const telefonoMH = (t: string | null | undefined) => {
  const d = soloDigitos(t);
  return d.length >= 8 ? d : null;
};

/** Número de control: DTE-01-M001P001-000000000000001 (31 caracteres). */
export function numeroControl(tipo: TipoDte, emisor: Pick<Emisor, "codEstable" | "codPuntoVenta">, correlativo: number): string {
  const sucursal = `${emisor.codEstable}${emisor.codPuntoVenta}`.toUpperCase();
  if (!/^[MBSP]\d{3}P\d{3}$/.test(sucursal)) throw new Error("Código de establecimiento o punto de venta no válido (ej. M001 y P001).");
  return `DTE-${tipo}-${sucursal}-${String(correlativo).padStart(15, "0")}`;
}

function identificacion(tipo: TipoDte, id: Identificacion) {
  const cont = id.contingencia ?? null;
  return {
    version: VERSION_DTE[tipo],
    ambiente: id.ambiente,
    tipoDte: tipo,
    numeroControl: id.numeroControl,
    codigoGeneracion: id.codigoGeneracion,
    tipoModelo: cont ? 2 : 1,
    tipoOperacion: cont ? 2 : 1,
    tipoContingencia: cont ? cont.tipo : null,
    motivoContin: cont ? (cont.tipo === 5 ? nulo(cont.motivo) ?? "Otro" : nulo(cont.motivo)) : null,
    fecEmi: id.fecEmi,
    horEmi: id.horEmi,
    tipoMoneda: "USD",
  };
}

function emisorDte(e: Emisor) {
  return {
    nit: soloDigitos(e.nit),
    nrc: soloDigitos(e.nrc),
    nombre: e.nombre.trim(),
    codActividad: e.codActividad,
    descActividad: e.descActividad.trim(),
    nombreComercial: nulo(e.nombreComercial),
    direccion: conDistrito(e.direccion),
    telefono: soloDigitos(e.telefono),
    correo: e.correo.trim(),
    codEstable: e.codEstable,
    codPuntoVenta: e.codPuntoVenta,
  };
}

/** El complemento de la dirección debe incluir el nombre del distrito (Normativa 2.0) */
function conDistrito(d: DireccionMH): DireccionMH {
  const distrito = nombreDistrito(d.departamento, d.distrito);
  const base = d.complemento.trim();
  const sinTildes = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const complemento = distrito && !sinTildes(base).includes(sinTildes(distrito)) ? `${base}, ${distrito}` : base;
  return { ...d, complemento: complemento.slice(0, 200) };
}

const pagosDte = (pagos: Pago[], total: number) => {
  const lista = pagos.filter((p) => p.monto > 0);
  if (!lista.length) return null;
  // El último pago absorbe el centavo de diferencia, si lo hay
  const suma = r2(lista.slice(0, -1).reduce((s, p) => s + r2(p.monto), 0));
  return lista.map((p, i) => ({
    codigo: p.codigo,
    montoPago: i === lista.length - 1 ? r2(total - suma) : r2(p.monto),
    referencia: p.codigo === "01" ? null : nulo(p.referencia)?.slice(0, 50) ?? null,
    plazo: null,
    periodo: null,
  }));
};

// ---------------------------------------------------------------------------------------------
// Factura (01): precios CON IVA; el IVA de cada línea va en ivaItem y el total en totalIva.
// ---------------------------------------------------------------------------------------------
export function armarFactura(p: {
  id: Identificacion;
  emisor: Emisor;
  receptor: ReceptorFactura | null;
  lineas: LineaVenta[];
  pagos: Pago[];
  observaciones?: string | null;
}) {
  const cuerpo = p.lineas.map((l, i) => {
    const precioUni = r8(l.precio);
    const montoDescu = r8(l.descuento);
    const ventaGravada = r8(precioUni * l.cantidad - montoDescu);
    return {
      numItem: i + 1,
      tipoItem: l.tipoItem,
      numeroDocumento: null,
      cantidad: r8(l.cantidad),
      codigo: nulo(l.codigo)?.slice(0, 25) ?? null,
      codTributo: null,
      uniMedida: l.uniMedida,
      descripcion: l.descripcion.trim().slice(0, 1000),
      precioUni,
      montoDescu,
      ventaNoSuj: 0,
      ventaExenta: 0,
      ventaGravada,
      tributos: null,
      psv: 0,
      noGravado: 0,
      ivaItem: r8((ventaGravada / (1 + IVA.tasa)) * IVA.tasa),
    };
  });
  const totalGravada = r2(cuerpo.reduce((s, c) => s + c.ventaGravada, 0));
  const totalDescu = r2(cuerpo.reduce((s, c) => s + c.montoDescu, 0));
  const totalIva = r2(cuerpo.reduce((s, c) => s + c.ivaItem, 0));
  const total = totalGravada;
  const r = p.receptor;
  const receptor = r
    ? {
        tipoDocumento: r.numDocumento ? r.tipoDocumento : null,
        numDocumento: r.numDocumento ? (r.tipoDocumento === "13" ? formatoDui(r.numDocumento) : soloDigitos(r.numDocumento) || r.numDocumento) : null,
        nrc: null,
        nombre: nulo(r.nombre)?.slice(0, 250) ?? null,
        codActividad: null,
        descActividad: null,
        direccion: r.direccion ? conDistrito(r.direccion) : null,
        telefono: telefonoMH(r.telefono),
        correo: nulo(r.correo),
      }
    : null;
  return {
    identificacion: identificacion("01", p.id),
    documentoRelacionado: null,
    emisor: emisorDte(p.emisor),
    receptor,
    otrosDocumentos: null,
    ventaTercero: null,
    cuerpoDocumento: cuerpo,
    resumen: {
      totalNoSuj: 0,
      totalExenta: 0,
      totalGravada,
      subTotalVentas: totalGravada,
      descuNoSuj: 0,
      descuExenta: 0,
      descuGravada: 0,
      porcentajeDescuento: 0,
      totalDescu,
      tributos: null,
      subTotal: totalGravada,
      ivaRete: 0,
      montoTotalOperacion: total,
      totalNoGravado: 0,
      totalPagar: total,
      totalLetras: montoEnLetras(total),
      totalIva,
      saldoFavor: 0,
      condicionOperacion: 1,
      pagos: pagosDte(p.pagos, total),
      numPagoElectronico: null,
      observaciones: nulo(p.observaciones)?.slice(0, 3000) ?? null,
    },
    apendice: null,
  };
}

/** DUI con guion: 00000000-0 */
export const formatoDui = (s: string) => {
  const d = soloDigitos(s);
  return d.length === 9 ? `${d.slice(0, 8)}-${d.slice(8)}` : s;
};

// ---------------------------------------------------------------------------------------------
// Crédito fiscal (03): precios SIN IVA; el IVA va una vez en resumen.tributos (código 20).
// ---------------------------------------------------------------------------------------------

/** Líneas sin IVA a partir de las de la tienda (con IVA). */
export function lineasSinIva(lineas: LineaVenta[]) {
  return lineas.map((l) => {
    const precioUni = r8(l.precio / (1 + IVA.tasa));
    const montoDescu = r8(l.descuento / (1 + IVA.tasa));
    return { l, precioUni, montoDescu, ventaGravada: r8(precioUni * l.cantidad - montoDescu) };
  });
}

/**
 * IVA del resumen: 13% del subtotal, ajustado dentro del centavo de holgura para que el total
 * coincida con lo que el cliente pagó (con IVA incluido).
 */
export function ivaConObjetivo(subTotal: number, objetivo: number | null) {
  const calculado = r2(subTotal * IVA.tasa);
  if (objetivo === null) return calculado;
  const ajustado = r2(objetivo - subTotal);
  return Math.abs(ajustado - calculado) <= 0.01 ? ajustado : calculado;
}

export function armarCreditoFiscal(p: {
  id: Identificacion;
  emisor: Emisor;
  receptor: ReceptorFiscal;
  lineas: LineaVenta[];
  pagos: Pago[];
  /** el receptor es agente de retención: retiene 1% si la venta sin IVA es de $100 o más */
  retiene1?: boolean;
  observaciones?: string | null;
}) {
  const sin = lineasSinIva(p.lineas);
  const cuerpo = sin.map((s, i) => ({
    numItem: i + 1,
    tipoItem: s.l.tipoItem,
    numeroDocumento: null,
    codigo: nulo(s.l.codigo)?.slice(0, 25) ?? null,
    codTributo: null,
    descripcion: s.l.descripcion.trim().slice(0, 1000),
    cantidad: r8(s.l.cantidad),
    uniMedida: s.l.uniMedida,
    precioUni: s.precioUni,
    montoDescu: s.montoDescu,
    ventaNoSuj: 0,
    ventaExenta: 0,
    ventaGravada: s.ventaGravada,
    tributos: [IVA.codigo],
    psv: 0,
    noGravado: 0,
  }));
  const totalGravada = r2(cuerpo.reduce((s, c) => s + c.ventaGravada, 0));
  const totalDescu = r2(cuerpo.reduce((s, c) => s + c.montoDescu, 0));
  const conIva = r2(p.lineas.reduce((s, l) => s + l.precio * l.cantidad - l.descuento, 0));
  const iva = ivaConObjetivo(totalGravada, conIva);
  const montoTotalOperacion = r2(totalGravada + iva);
  const ivaRete = p.retiene1 && totalGravada >= 100 ? r2(totalGravada * 0.01) : 0;
  const totalPagar = r2(montoTotalOperacion - ivaRete);
  const r = p.receptor;
  return {
    identificacion: identificacion("03", p.id),
    documentoRelacionado: null,
    emisor: emisorDte(p.emisor),
    receptor: {
      nit: soloDigitos(r.nit),
      nrc: soloDigitos(r.nrc),
      nombre: r.nombre.trim().slice(0, 250),
      codActividad: r.codActividad,
      descActividad: r.descActividad.trim().slice(0, 150),
      nombreComercial: nulo(r.nombreComercial)?.slice(0, 150) ?? null,
      direccion: conDistrito(r.direccion),
      telefono: telefonoMH(r.telefono),
      correo: nulo(r.correo),
    },
    otrosDocumentos: null,
    ventaTercero: null,
    cuerpoDocumento: cuerpo,
    resumen: {
      totalNoSuj: 0,
      totalExenta: 0,
      totalGravada,
      subTotalVentas: totalGravada,
      descuNoSuj: 0,
      descuExenta: 0,
      descuGravada: 0,
      porcentajeDescuento: 0,
      totalDescu,
      tributos: [{ codigo: IVA.codigo, descripcion: IVA.descripcion, valor: iva }],
      subTotal: totalGravada,
      ivaPerci: 0,
      ivaRete,
      montoTotalOperacion,
      totalNoGravado: 0,
      totalPagar,
      totalLetras: montoEnLetras(totalPagar),
      saldoFavor: 0,
      condicionOperacion: 1,
      pagos: pagosDte(p.pagos, totalPagar),
      numPagoElectronico: null,
      observaciones: nulo(p.observaciones)?.slice(0, 3000) ?? null,
    },
    apendice: null,
  };
}

// ---------------------------------------------------------------------------------------------
// Nota de crédito (05): rebaja o devolución sobre un crédito fiscal ya recibido por Hacienda.
// Precios SIN IVA; cada línea referencia el código de generación del crédito fiscal.
// ---------------------------------------------------------------------------------------------
export type LineaNota = {
  codigo: string | null;
  descripcion: string;
  cantidad: number;
  /** precio unitario SIN IVA (como en el crédito fiscal) */
  precioUni: number;
  /** descuento total de la línea SIN IVA */
  montoDescu: number;
  tipoItem: 1 | 2;
  uniMedida: number;
};

export function armarNotaCredito(p: {
  id: Identificacion;
  emisor: Emisor;
  receptor: ReceptorFiscal;
  /** crédito fiscal al que se aplica */
  ccf: { codigoGeneracion: string; fecEmi: string };
  lineas: LineaNota[];
  /** el receptor retiene 1% (si lo hizo en el crédito fiscal) */
  retiene1?: boolean;
  observaciones?: string | null;
}) {
  const cuerpo = p.lineas.map((l, i) => {
    const precioUni = r8(l.precioUni);
    const montoDescu = r8(l.montoDescu);
    const ventaGravada = r8(precioUni * l.cantidad - montoDescu);
    return {
      numItem: i + 1,
      tipoItem: l.tipoItem,
      numeroDocumento: p.ccf.codigoGeneracion,
      cantidad: r8(l.cantidad),
      codigo: nulo(l.codigo)?.slice(0, 25) ?? null,
      codTributo: null,
      uniMedida: l.uniMedida,
      descripcion: l.descripcion.trim().slice(0, 1000),
      precioUni,
      montoDescu,
      ventaNoSuj: 0,
      ventaExenta: 0,
      ventaGravada,
      tributos: [IVA.codigo],
      noGravado: 0,
      ivaPerci: 0,
      // totalIva por ítem solo se usa al ajustar un comprobante de retención; con un CCF va en 0
      totalIva: 0,
      ivaRete: 0,
    };
  });
  const totalGravada = r2(cuerpo.reduce((s, c) => s + c.ventaGravada, 0));
  const totalDescu = r2(cuerpo.reduce((s, c) => s + c.montoDescu, 0));
  // Como en el crédito fiscal: el IVA se ajusta dentro del centavo para que cuadre con el precio con IVA
  const iva = ivaConObjetivo(totalGravada, r2(cuerpo.reduce((s, c) => s + c.ventaGravada, 0) * (1 + IVA.tasa)));
  const ivaRete = p.retiene1 && totalGravada >= 100 ? r2(totalGravada * 0.01) : 0;
  const montoTotalOperacion = r2(totalGravada + iva);
  const totalPagar = r2(montoTotalOperacion - ivaRete);
  const r = p.receptor;
  return {
    identificacion: { ...identificacion("05", p.id), fusion: null },
    documentoRelacionado: [{ tipoDocumento: "03", tipoGeneracion: 2, numeroDocumento: p.ccf.codigoGeneracion, fechaEmision: p.ccf.fecEmi }],
    emisor: (({ codEstable, codPuntoVenta, ...resto }) => (void codEstable, void codPuntoVenta, resto))(emisorDte(p.emisor)),
    receptor: {
      tipoDocumento: "36",
      numDocumento: soloDigitos(r.nit),
      nrc: soloDigitos(r.nrc),
      nombre: r.nombre.trim().slice(0, 250),
      codActividad: r.codActividad,
      descActividad: r.descActividad.trim().slice(0, 150),
      nombreComercial: nulo(r.nombreComercial)?.slice(0, 150) ?? null,
      direccion: conDistrito(r.direccion),
      telefono: telefonoMH(r.telefono),
      correo: nulo(r.correo),
    },
    ventaTercero: null,
    cuerpoDocumento: cuerpo,
    resumen: {
      totalNoSuj: 0,
      totalExenta: 0,
      totalGravada,
      subTotalVentas: totalGravada,
      totalDescu,
      tributos: [{ codigo: IVA.codigo, descripcion: IVA.descripcion, valor: iva }],
      montoTotalOperacion,
      ivaPerci: 0,
      totalIva: 0,
      ivaRete,
      totalNoGravado: 0,
      totalPagar,
      totalLetras: montoEnLetras(totalPagar),
      condicionOperacion: 1,
      observaciones: nulo(p.observaciones)?.slice(0, 3000) ?? null,
      codigoRetencionMH: null,
    },
    apendice: null,
  };
}

// ---------------------------------------------------------------------------------------------
// Evento de invalidación (v3)
// ---------------------------------------------------------------------------------------------
export function armarInvalidacion(p: {
  ambiente: "00" | "01";
  codigoGeneracion: string;
  fecEmi: string;
  horEmi: string;
  emisor: Emisor;
  documento: {
    tipoDte: TipoDte;
    codigoGeneracion: string;
    selloRecibido: string;
    numeroControl: string;
    fecEmi: string;
    /** receptor tal como va en el documento (null si la factura no lo traía) */
    tipoDocumento: string | null;
    numDocumento: string | null;
    nombre: string | null;
    telefono: string | null;
    correo: string | null;
  };
  tipo: 1 | 2 | 3;
  /** código de generación del documento que reemplaza al anulado (tipos 1 y 3) */
  reemplazo: string | null;
  motivo: string | null;
  solicita: { nombre: string; tipoDoc: string; numDoc: string };
}) {
  const e = p.emisor;
  const d = p.documento;
  return {
    identificacion: {
      version: VERSION_INVALIDACION,
      ambiente: p.ambiente,
      codigoGeneracion: p.codigoGeneracion,
      fecEmi: p.fecEmi,
      horEmi: p.horEmi,
      fusion: null,
    },
    emisor: {
      nit: soloDigitos(e.nit),
      nombre: e.nombre.trim(),
      codEstableMH: e.codEstable,
      codEstable: null,
      codPuntoVentaMH: e.codPuntoVenta,
      codPuntoVenta: null,
      telefono: soloDigitos(e.telefono),
      correo: e.correo.trim(),
    },
    documento: {
      tipoDte: d.tipoDte,
      codigoGeneracion: d.codigoGeneracion,
      selloRecibido: d.selloRecibido,
      numeroControl: d.numeroControl,
      fecEmi: d.fecEmi,
      codigoGeneracionR: p.tipo === 2 || d.tipoDte === "05" ? null : p.reemplazo,
      tipoDocumento: d.tipoDocumento,
      numDocumento: d.numDocumento,
      nombre: d.nombre,
      telefono: telefonoMH(d.telefono),
      correo: nulo(d.correo),
    },
    motivo: {
      tipoAnulacion: p.tipo,
      motivoAnulacion: nulo(p.motivo)?.slice(0, 200) ?? null,
      nombreResponsable: e.responsable.nombre.trim().slice(0, 100),
      tipDocResponsable: e.responsable.tipoDoc,
      numDocResponsable: e.responsable.tipoDoc === "13" ? formatoDui(e.responsable.numDoc) : soloDigitos(e.responsable.numDoc),
      nombreSolicita: p.solicita.nombre.trim().slice(0, 100),
      tipDocSolicita: p.solicita.tipoDoc,
      numDocSolicita: p.solicita.tipoDoc === "13" ? formatoDui(p.solicita.numDoc) : soloDigitos(p.solicita.numDoc),
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Evento de contingencia (v4)
// ---------------------------------------------------------------------------------------------
export function armarContingencia(p: {
  ambiente: "00" | "01";
  codigoGeneracion: string;
  fTransmision: string;
  hTransmision: string;
  emisor: Emisor;
  documentos: { tipoDte: TipoDte; codigoGeneracion: string }[];
  inicio: { fecha: string; hora: string };
  fin: { fecha: string; hora: string };
  tipo: number;
  motivo: string | null;
}) {
  const e = p.emisor;
  return {
    identificacion: {
      version: VERSION_CONTINGENCIA,
      ambiente: p.ambiente,
      codigoGeneracion: p.codigoGeneracion,
      fTransmision: p.fTransmision,
      hTransmision: p.hTransmision,
    },
    emisor: {
      nit: soloDigitos(e.nit),
      nombre: e.nombre.trim(),
      nombreResponsable: e.responsable.nombre.trim().slice(0, 100),
      tipoDocResponsable: e.responsable.tipoDoc,
      numeroDocResponsable: e.responsable.tipoDoc === "13" ? formatoDui(e.responsable.numDoc) : soloDigitos(e.responsable.numDoc),
      tipoEstablecimiento: e.tipoEstablecimiento,
      codEstableMH: e.codEstable,
      codPuntoVentaMH: e.codPuntoVenta,
      telefono: soloDigitos(e.telefono),
      correo: e.correo.trim(),
    },
    detalleDTE: p.documentos.map((d, i) => ({ noItem: i + 1, tipoDoc: d.tipoDte, codigoGeneracion: d.codigoGeneracion })),
    motivo: {
      fInicio: p.inicio.fecha,
      fFin: p.fin.fecha,
      hInicio: p.inicio.hora,
      hFin: p.fin.hora,
      tipoContingencia: p.tipo,
      motivoContingencia: p.tipo === 5 ? nulo(p.motivo) ?? "Otro" : nulo(p.motivo),
    },
  };
}

export { UNIDAD };
