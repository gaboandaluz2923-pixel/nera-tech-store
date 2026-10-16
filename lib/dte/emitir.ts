import "server-only";
import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { enviarCorreo } from "@/lib/correo";
import { correoDte, correoDteInvalidado, type Marco } from "@/lib/correos/plantillas";
import { createServiceClient } from "@/lib/supabase/server";
import { configTienda } from "@/lib/tienda/datos";
import { COLUMNAS_DESCUENTOS } from "@/lib/tienda/descuentos";
import { SITE_URL } from "@/lib/url-sitio";
import { enlaceWhatsAppA } from "@/lib/whatsapp";
import {
  armarContingencia,
  armarCreditoFiscal,
  armarFactura,
  armarInvalidacion,
  armarNotaCredito,
  numeroControl,
  type Emisor,
  type Identificacion,
  type LineaNota,
  type LineaVenta,
  type Pago,
  type ReceptorFactura,
  type ReceptorFiscal,
} from "./armar";
import {
  FORMA_PAGO_MH,
  TIPO_DTE,
  UNIDAD,
  VERSION_CONTINGENCIA,
  VERSION_DTE,
  VERSION_INVALIDACION,
  direccionValida,
  nitValido,
  nrcValido,
  soloDigitos,
  type DireccionMH,
  type TipoDte,
} from "./catalogos";
import { certificadoDelEntorno, firmarJws, ErrorFirma } from "./firma";
import {
  ambienteActual,
  consultarDte,
  ErrorMH,
  fechaMH,
  transmitirContingencia,
  transmitirDte,
  transmitirInvalidacion,
  type Ambiente,
  type RespuestaMH,
} from "./mh";
import { r2 } from "./montos";
import { archivoDte, pdfDte } from "./pdf";
import { validarEsquema, type Esquema } from "./validar";

// Emisión de documentos tributarios electrónicos: arma, revisa contra el esquema, firma, transmite a
// Hacienda (con la política de reintentos) y, si Hacienda no responde, pasa a contingencia.
// Todo con la clave de servicio: lo llaman las acciones del panel después de verificar al usuario.

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export class ErrorDte extends Error {
  detalles: string[];
  constructor(mensaje: string, detalles: string[] = []) {
    super(mensaje);
    this.detalles = detalles;
  }
}

// ---------------------------------------------------------------------------------------------
// Configuración (Panel → Facturación)
// ---------------------------------------------------------------------------------------------
export type ConfigDte = {
  /** Emitir con el sistema propio (si no, se sigue anotando a mano la factura de otro sistema) */
  activo: boolean;
  /** Emitir sola la factura al quedar pagado el pedido (solo en producción) */
  automatica: boolean;
  emisor: Partial<Emisor>;
  /** Cliente a cuyo nombre salen los créditos fiscales del botón de pruebas (si no, el propio emisor) */
  receptorPrueba: DatosFiscales | null;
};

export async function configDte(): Promise<ConfigDte> {
  const { data } = await createServiceClient().from("configuracion").select("valor").eq("clave", "dte").maybeSingle();
  const v = (data?.valor ?? {}) as Partial<ConfigDte>;
  return {
    activo: Boolean(v.activo),
    automatica: Boolean(v.automatica),
    emisor: (v.emisor ?? {}) as Partial<Emisor>,
    receptorPrueba: (v.receptorPrueba ?? null) as DatosFiscales | null,
  };
}

/** Qué falta en los datos del emisor (vacío = listo). */
export function faltantesEmisor(e: Partial<Emisor>): string[] {
  const f: string[] = [];
  if (!nitValido(e.nit)) f.push("NIT (14 dígitos)");
  if (!nrcValido(e.nrc)) f.push("NRC");
  if (!e.nombre?.trim()) f.push("razón social");
  if (!/^\d{5,6}$/.test(e.codActividad ?? "") || !e.descActividad?.trim()) f.push("actividad económica");
  if (!direccionValida(e.direccion)) f.push("dirección (departamento, municipio, distrito y complemento)");
  if (soloDigitos(e.telefono).length < 8) f.push("teléfono");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.correo ?? "")) f.push("correo");
  if (!/^[MBSP]\d{3}$/.test(e.codEstable ?? "")) f.push("código de establecimiento (ej. M001)");
  if (!/^P\d{3}$/.test(e.codPuntoVenta ?? "")) f.push("código de punto de venta (ej. P001)");
  if (!e.tipoEstablecimiento) f.push("tipo de establecimiento");
  if (!e.responsable?.nombre?.trim() || !e.responsable?.numDoc?.trim()) f.push("responsable (nombre y documento)");
  return f;
}

async function emisorListo(): Promise<{ cfg: ConfigDte; emisor: Emisor }> {
  const cfg = await configDte();
  const faltan = faltantesEmisor(cfg.emisor);
  if (faltan.length) throw new ErrorDte("Faltan datos del emisor en Panel → Facturación.", faltan);
  return { cfg, emisor: cfg.emisor as Emisor };
}

// ---------------------------------------------------------------------------------------------
// Fechas (El Salvador, UTC−6 sin horario de verano)
// ---------------------------------------------------------------------------------------------
export function ahoraSV(d = new Date()) {
  const sv = new Date(d.getTime() - 6 * 3600_000).toISOString();
  return { fecha: sv.slice(0, 10), hora: sv.slice(11, 19) };
}

// ---------------------------------------------------------------------------------------------
// Datos de un pedido
// ---------------------------------------------------------------------------------------------
type LineaPedido = { id: string; nombre: string; cantidad: number; precio_unitario: number; variantes: { sku: string | null } | null };
export type PedidoDte = {
  id: string;
  numero: number;
  token: string;
  estado: string;
  forma_pago: string;
  subtotal: number;
  envio: number;
  total: number;
  pagado_en: string | null;
  confirmado_en: string | null;
  entregado_en: string | null;
  factura_estado: string;
  entrega: { nombre: string; telefono: string; correo?: string | null };
  facturacion: { tipo: string; nit?: string; nrc?: string; nombre?: string; giro?: string } | null;
  clientes: { id: string; datos_fiscales: DatosFiscales | null } | null;
  lineas_pedido: LineaPedido[];
  pagos: { metodo: string; estado: string; referencia_externa: string | null; monto: number }[];
};

/** Lo que se guarda del cliente para el crédito fiscal (clientes.datos_fiscales) */
export type DatosFiscales = {
  nit: string;
  nrc: string;
  nombre: string;
  nombreComercial: string | null;
  codActividad: string;
  descActividad: string;
  direccion: DireccionMH;
  telefono: string | null;
  correo: string | null;
  /** el cliente es agente de retención (gran contribuyente): retiene 1% */
  retiene1?: boolean;
};

export function faltantesFiscales(d: Partial<DatosFiscales> | null | undefined): string[] {
  const f: string[] = [];
  if (!nitValido(d?.nit)) f.push("NIT");
  if (!nrcValido(d?.nrc)) f.push("NRC");
  if (!d?.nombre?.trim()) f.push("nombre o razón social");
  if (!/^\d{5,6}$/.test(d?.codActividad ?? "") || !d?.descActividad?.trim()) f.push("actividad económica");
  if (!direccionValida(d?.direccion)) f.push("dirección con departamento, municipio y distrito");
  return f;
}

const COLUMNAS_PEDIDO = `id, numero, token, estado, forma_pago, subtotal, envio, total, pagado_en, confirmado_en, entregado_en,
  factura_estado, entrega, facturacion, ${COLUMNAS_DESCUENTOS}, clientes(id, datos_fiscales),
  lineas_pedido(id, nombre, cantidad, precio_unitario, variantes(sku)), pagos(metodo, estado, referencia_externa, monto)`;

export async function cargarPedido(pedidoId: string): Promise<PedidoDte> {
  const { data, error } = await createServiceClient().from("pedidos").select(COLUMNAS_PEDIDO).eq("id", pedidoId).single();
  if (error || !data) throw new ErrorDte("No se encontró el pedido.");
  return data as unknown as PedidoDte;
}

/**
 * Líneas para Hacienda con precios con IVA. Todos los descuentos del pedido (combos, efectivo o
 * transferencia, cupón y puntos) se reparten entre los productos como "descuento por ítem", en
 * centavos, para que el total del documento sea exactamente lo que pagó el cliente. El envío va como servicio.
 */
export async function lineasDelPedido(p: PedidoDte): Promise<LineaVenta[]> {
  const lineas = p.lineas_pedido;
  if (!lineas.length) throw new ErrorDte("El pedido no tiene productos.");
  const { data: unidades } = await createServiceClient()
    .from("unidades")
    .select("linea_pedido_id, identificador, tipo")
    .in("linea_pedido_id", lineas.map((l) => l.id));
  const ids = new Map<string, string[]>();
  for (const u of unidades ?? []) {
    const k = u.linea_pedido_id as string;
    ids.set(k, [...(ids.get(k) ?? []), `${u.tipo === "imei" ? "IMEI" : u.tipo === "serie" ? "Serie" : "Código"} ${u.identificador}`]);
  }
  const brutos = lineas.map((l) => r2(Number(l.precio_unitario) * l.cantidad));
  const productos = r2(brutos.reduce((s, x) => s + x, 0));
  const envio = r2(Number(p.envio) || 0);
  let descuento = r2(productos + envio - Number(p.total));
  if (descuento < 0) throw new ErrorDte(`El total del pedido (${p.total}) es mayor que productos + envío. Revisalo antes de facturar.`);
  if (descuento > productos) throw new ErrorDte("Los descuentos superan el valor de los productos. Revisá el pedido.");
  // Reparto proporcional en centavos; la última línea absorbe la diferencia
  const repartos = brutos.map((b) => (productos > 0 ? Math.floor(((b / productos) * descuento) * 100) / 100 : 0));
  let resto = r2(descuento - repartos.reduce((s, x) => s + x, 0));
  for (let i = brutos.length - 1; i >= 0 && resto > 0; i--) {
    const cabe = r2(Math.min(resto, brutos[i] - repartos[i]));
    repartos[i] = r2(repartos[i] + cabe);
    resto = r2(resto - cabe);
  }
  descuento = 0;
  const salida: LineaVenta[] = lineas.map((l, i) => {
    const extra = ids.get(l.id);
    return {
      codigo: l.variantes?.sku ?? null,
      descripcion: `${l.nombre}${extra?.length ? ` · ${extra.join(", ")}` : ""}`,
      cantidad: l.cantidad,
      precio: Number(l.precio_unitario),
      descuento: repartos[i],
      tipoItem: 1,
      uniMedida: UNIDAD.unidad,
    };
  });
  if (envio > 0) {
    salida.push({ codigo: "ENVIO", descripcion: "Envío a domicilio", cantidad: 1, precio: envio, descuento: 0, tipoItem: 2, uniMedida: UNIDAD.otra });
  }
  return salida;
}

export function pagosDelPedido(p: PedidoDte, total: number): Pago[] {
  const fp = FORMA_PAGO_MH[p.forma_pago] ?? { codigo: "99", nombre: "Otros" };
  const aprobado = p.pagos.find((x) => x.estado === "aprobado");
  return [{ codigo: fp.codigo, monto: total, referencia: aprobado?.referencia_externa ?? null }];
}

export function receptorFacturaDePedido(p: PedidoDte): ReceptorFactura {
  // La ley prohíbe exigir documento de identidad o correo al consumidor final (operaciones < $25,000)
  return {
    nombre: p.entrega?.nombre ?? null,
    tipoDocumento: null,
    numDocumento: null,
    telefono: p.entrega?.telefono ?? null,
    correo: p.entrega?.correo ?? null,
    direccion: null,
  };
}

// ---------------------------------------------------------------------------------------------
// Núcleo: armar → revisar → número de control → firmar → guardar → transmitir
// ---------------------------------------------------------------------------------------------
type Plantilla = (id: Identificacion) => Json;

export type ResultadoEmision = {
  id: string;
  estado: string;
  numeroControl: string;
  mensaje: string;
  observaciones: string[];
};


/** Revisa el documento con un número de control provisional (para no gastar números en errores). */
function revisar(tipo: TipoDte, armar: Plantilla, base: Omit<Identificacion, "numeroControl">, emisor: Emisor) {
  const provisional = armar({ ...base, numeroControl: numeroControl(tipo, emisor, 1) });
  const errores = validarEsquema(tipo as Esquema, provisional);
  if (errores.length) throw new ErrorDte("El documento no cumple el formato de Hacienda.", errores);
}

async function siguienteNumero(ambiente: Ambiente, anio: number): Promise<number> {
  // Una sola serie para todos los tipos de documento (Normativa 2.0, regla 7.1.2)
  const { data, error } = await createServiceClient().rpc("dte_siguiente_numero", { p_ambiente: ambiente, p_tipo: "todos", p_anio: anio });
  if (error || !data) throw new ErrorDte(`No se pudo obtener el número de control: ${error?.message ?? "sin respuesta"}`);
  return Number(data);
}

async function crearDocumento(p: {
  tipo: TipoDte;
  armar: Plantilla;
  emisor: Emisor;
  ambiente: Ambiente;
  pedidoId?: string | null;
  relacionadoId?: string | null;
  receptor: { nombre: string | null; documento: string | null; correo: string | null };
  prueba?: boolean;
  usuario: string;
  contingencia?: { tipo: number; motivo: string | null } | null;
  fecha?: { fecha: string; hora: string };
}): Promise<string> {
  const ahora = p.fecha ?? ahoraSV();
  const base = {
    ambiente: p.ambiente,
    codigoGeneracion: randomUUID().toUpperCase(),
    fecEmi: ahora.fecha,
    horEmi: ahora.hora,
    contingencia: p.contingencia ?? null,
  };
  revisar(p.tipo, p.armar, base, p.emisor);
  const cert = certificadoDelEntorno(); // antes de gastar el número: si falta el certificado, se avisa
  const correlativo = await siguienteNumero(p.ambiente, Number(ahora.fecha.slice(0, 4)));
  const json = p.armar({ ...base, numeroControl: numeroControl(p.tipo, p.emisor, correlativo) });
  const errores = validarEsquema(p.tipo as Esquema, json);
  if (errores.length) throw new ErrorDte("El documento no cumple el formato de Hacienda.", errores);
  const firma = firmarJws(json, cert.llave);
  const resumen = json.resumen as Json;
  const { data, error } = await createServiceClient()
    .from("dte_documentos")
    .insert({
      ambiente: p.ambiente,
      tipo_dte: p.tipo,
      version: VERSION_DTE[p.tipo],
      codigo_generacion: base.codigoGeneracion,
      numero_control: json.identificacion.numeroControl,
      fec_emi: base.fecEmi,
      hor_emi: base.horEmi,
      tipo_modelo: json.identificacion.tipoModelo,
      tipo_operacion: json.identificacion.tipoOperacion,
      pedido_id: p.pedidoId ?? null,
      relacionado_id: p.relacionadoId ?? null,
      receptor_nombre: p.receptor.nombre,
      receptor_documento: p.receptor.documento,
      receptor_correo: p.receptor.correo,
      total: Number(resumen.totalPagar ?? resumen.montoTotalOperacion ?? 0),
      iva: Number(resumen.totalIva || (Array.isArray(resumen.tributos) ? resumen.tributos[0]?.valor : 0) || 0),
      json,
      firma,
      estado: p.contingencia ? "contingencia" : "pendiente",
      prueba: Boolean(p.prueba),
      creado_por: p.usuario,
    })
    .select("id")
    .single();
  if (error || !data) throw new ErrorDte(`No se pudo guardar el documento: ${error?.message ?? "sin respuesta"}`);
  return data.id as string;
}

/** Documento del botón de pruebas (no ligado a un pedido). */
export async function crearDocumentoPrueba(
  tipo: TipoDte,
  armar: Plantilla,
  emisor: Emisor,
  usuario: string,
  nombre: string | null,
  contingencia?: { tipo: number; motivo: string | null }
) {
  return crearDocumento({ tipo, armar, emisor, ambiente: "00", receptor: { nombre, documento: null, correo: null }, prueba: true, usuario, contingencia });
}

type FilaDte = {
  id: string;
  ambiente: Ambiente;
  tipo_dte: TipoDte;
  version: number;
  codigo_generacion: string;
  numero_control: string;
  fec_emi: string;
  hor_emi: string;
  tipo_operacion: number;
  pedido_id: string | null;
  relacionado_id: string | null;
  receptor_nombre: string | null;
  receptor_correo: string | null;
  total: number;
  json: Json;
  firma: string | null;
  estado: string;
  sello_recibido: string | null;
  intentos: number;
  contingencia_id: string | null;
  prueba: boolean;
};

async function fila(id: string): Promise<FilaDte> {
  const { data } = await createServiceClient().from("dte_documentos").select("*").eq("id", id).single();
  if (!data) throw new ErrorDte("No se encontró el documento.");
  return data as FilaDte;
}

const textoRespuesta = (r: RespuestaMH) => [r.codigoMsg, r.descripcionMsg].filter(Boolean).join(" · ") || r.estado || "Sin detalle";

async function marcarProcesado(d: FilaDte, r: RespuestaMH, usuario = "sistema") {
  const sb = createServiceClient();
  await sb
    .from("dte_documentos")
    .update({
      estado: "procesado",
      sello_recibido: r.selloRecibido,
      fh_procesamiento: fechaMH(r.fhProcesamiento) ?? new Date().toISOString(),
      mensaje: textoRespuesta(r),
      observaciones: r.observaciones,
      respuesta: r.bruta,
    })
    .eq("id", d.id);
  // Solo lo de producción cuenta para el pedido y le llega al cliente (lo de pruebas no tiene valor legal)
  const real = d.ambiente === "01" && !d.prueba;
  if (d.pedido_id && (d.tipo_dte === "01" || d.tipo_dte === "03") && real) {
    const { data: ped } = await sb.from("pedidos").select("estado").eq("id", d.pedido_id).single();
    await sb
      .from("pedidos")
      .update({ factura_estado: "emitida", factura_numero: d.numero_control, factura_emitida_en: new Date().toISOString() })
      .eq("id", d.pedido_id);
    await sb.from("pedido_eventos").insert({
      pedido_id: d.pedido_id,
      estado_anterior: ped?.estado,
      estado_nuevo: ped?.estado,
      nota: `${TIPO_DTE[d.tipo_dte]} electrónica ${d.numero_control} recibida por Hacienda${d.tipo_operacion === 2 ? " (enviada después de la contingencia)" : ""}`,
      usuario,
    });
  }
  if (real) after(() => enviarDteCliente(d.id).catch((e) => console.error("enviarDteCliente", e)));
}

/**
 * Envía a Hacienda con la política de reintentos del Manual tecnológico (3.3): si no responde en 8 s,
 * se consulta si lo recibió; si no, se reenvía (máximo 2 veces). Si aun así no hay respuesta, el
 * documento pasa a contingencia (se entrega al cliente sin sello y se reporta después).
 */
export async function transmitir(id: string, usuario = "sistema"): Promise<ResultadoEmision> {
  let d = await fila(id);
  const salida = (mensaje: string, observaciones: string[] = []) => ({
    id: d.id,
    estado: d.estado,
    numeroControl: d.numero_control,
    mensaje,
    observaciones,
  });
  if (d.estado === "procesado" || d.estado === "invalidado") return salida("Ya estaba recibido por Hacienda.");
  if (d.estado === "contingencia" && !d.contingencia_id) return salida("En contingencia: se envía después de reportar el evento.");
  const emisor = soloDigitos((d.json.emisor as Json)?.nit);
  const sb = createServiceClient();

  for (let intento = 0; intento < 3; intento++) {
    await sb.from("dte_documentos").update({ intentos: d.intentos + 1 }).eq("id", d.id);
    d.intentos += 1;
    try {
      const r = await transmitirDte({
        ambiente: d.ambiente,
        tipoDte: d.tipo_dte,
        version: d.version,
        codigoGeneracion: d.codigo_generacion,
        firmado: d.firma!,
      });
      if (r.estado === "PROCESADO" && r.selloRecibido) {
        await marcarProcesado(d, r, usuario);
        d = await fila(id);
        return salida(r.observaciones.length ? "Recibido por Hacienda con observaciones." : "Recibido por Hacienda.", r.observaciones);
      }
      // ¿Ya lo tenía? (reenvío después de un corte): se consulta y se toma su sello
      if (/existe/i.test(r.descripcionMsg ?? "")) {
        const c = await consultarDte({ ambiente: d.ambiente, nitEmisor: emisor, tipoDte: d.tipo_dte, codigoGeneracion: d.codigo_generacion }).catch(() => null);
        if (c?.estado === "PROCESADO" && c.selloRecibido) {
          await marcarProcesado(d, c, usuario);
          d = await fila(id);
          return salida("Hacienda ya lo tenía recibido.");
        }
      }
      await sb
        .from("dte_documentos")
        .update({ estado: d.estado === "contingencia" ? "contingencia" : "rechazado", mensaje: textoRespuesta(r), observaciones: r.observaciones, respuesta: r.bruta })
        .eq("id", d.id);
      d = await fila(id);
      return salida(`Hacienda lo rechazó: ${textoRespuesta(r)}`, r.observaciones);
    } catch (e) {
      if (!(e instanceof ErrorMH) || !e.sinRespuesta) {
        const mensaje = e instanceof Error ? e.message : "Error desconocido";
        await sb.from("dte_documentos").update({ mensaje }).eq("id", d.id);
        throw e instanceof ErrorMH ? new ErrorDte(mensaje) : e;
      }
      // Sin respuesta: ¿lo recibió igual?
      const c = await consultarDte({ ambiente: d.ambiente, nitEmisor: emisor, tipoDte: d.tipo_dte, codigoGeneracion: d.codigo_generacion }).catch(() => null);
      if (c?.estado === "PROCESADO" && c.selloRecibido) {
        await marcarProcesado(d, c, usuario);
        d = await fila(id);
        return salida("Recibido por Hacienda.");
      }
    }
  }
  if (d.estado === "contingencia") {
    await sb.from("dte_documentos").update({ mensaje: "Hacienda sigue sin responder; se reintenta más tarde." }).eq("id", d.id);
    return salida("Hacienda sigue sin responder; se reintenta más tarde.");
  }
  await pasarAContingencia(d.id, 1, null);
  d = await fila(id);
  return salida("Hacienda no respondió. El documento quedó en contingencia: se entrega al cliente y se reporta cuando Hacienda vuelva.");
}

/** Mismo número y código, con modelo diferido y transmisión por contingencia; se firma de nuevo. */
async function pasarAContingencia(id: string, tipo: number, motivo: string | null) {
  const d = await fila(id);
  const json = structuredClone(d.json);
  Object.assign(json.identificacion, {
    tipoModelo: 2,
    tipoOperacion: 2,
    tipoContingencia: tipo,
    motivoContin: tipo === 5 ? motivo || "Otro" : motivo,
  });
  const errores = validarEsquema(d.tipo_dte as Esquema, json);
  if (errores.length) throw new ErrorDte("No se pudo pasar a contingencia.", errores);
  const firma = firmarJws(json, certificadoDelEntorno().llave);
  await createServiceClient()
    .from("dte_documentos")
    .update({ json, firma, estado: "contingencia", tipo_modelo: 2, tipo_operacion: 2, mensaje: "Emitido en contingencia: Hacienda no respondió." })
    .eq("id", id);
  if (d.ambiente === "01" && !d.prueba) after(() => enviarDteCliente(id).catch((e) => console.error("enviarDteCliente", e)));
}

// ---------------------------------------------------------------------------------------------
// Contingencia: evento + envío de los documentos (Manual funcional VIII)
// ---------------------------------------------------------------------------------------------
export async function procesarContingencias(ambiente: Ambiente = ambienteActual(), usuario = "sistema", soloPruebas?: boolean) {
  const sb = createServiceClient();
  const resultado = { eventos: 0, enviados: 0, rechazados: 0, mensaje: "" };
  let q = sb
    .from("dte_documentos")
    .select("id, tipo_dte, codigo_generacion, created_at, json")
    .eq("ambiente", ambiente)
    .eq("estado", "contingencia")
    .is("contingencia_id", null)
    .order("created_at")
    .limit(1000);
  if (soloPruebas !== undefined) q = q.eq("prueba", soloPruebas);
  const { data: sinEvento } = await q;
  if (sinEvento?.length) {
    const { emisor } = await emisorListo();
    const primero = sinEvento[0];
    const inicio = ahoraSV(new Date(primero.created_at as string));
    const fin = ahoraSV();
    // hFin debe ser mayor que hInicio cuando es el mismo día
    if (inicio.fecha === fin.fecha && fin.hora <= inicio.hora) fin.hora = ahoraSV(new Date(Date.now() + 1000)).hora;
    const ident = (primero.json as Json).identificacion as Json;
    const codigo = randomUUID().toUpperCase();
    const json = armarContingencia({
      ambiente,
      codigoGeneracion: codigo,
      fTransmision: fin.fecha,
      hTransmision: fin.hora,
      emisor,
      documentos: sinEvento.map((x) => ({ tipoDte: x.tipo_dte as TipoDte, codigoGeneracion: x.codigo_generacion as string })),
      inicio,
      fin,
      tipo: Number(ident.tipoContingencia) || 1,
      motivo: (ident.motivoContin as string) ?? null,
    });
    const errores = validarEsquema("contingencia", json);
    if (errores.length) throw new ErrorDte("El evento de contingencia no cumple el formato.", errores);
    const firma = firmarJws(json, certificadoDelEntorno().llave);
    const prueba = sinEvento.every(() => soloPruebas === true);
    const { data: ev } = await sb
      .from("dte_eventos")
      .insert({ ambiente, tipo: "contingencia", version: VERSION_CONTINGENCIA, codigo_generacion: codigo, json, firma, prueba, creado_por: usuario })
      .select("id")
      .single();
    const r = await transmitirContingencia({ ambiente, nit: emisor.nit, firmado: firma });
    resultado.eventos++;
    if (r.estado === "RECIBIDO" && r.selloRecibido) {
      await sb
        .from("dte_eventos")
        .update({ estado: "procesado", sello_recibido: r.selloRecibido, fh_procesamiento: fechaMH(r.fhProcesamiento), mensaje: textoRespuesta(r), observaciones: r.observaciones, respuesta: r.bruta })
        .eq("id", ev!.id);
      await sb.from("dte_documentos").update({ contingencia_id: ev!.id }).in("id", sinEvento.map((x) => x.id));
    } else {
      await sb
        .from("dte_eventos")
        .update({ estado: "rechazado", mensaje: textoRespuesta(r), observaciones: r.observaciones, respuesta: r.bruta })
        .eq("id", ev!.id);
      resultado.mensaje = `Hacienda rechazó el evento de contingencia: ${textoRespuesta(r)}`;
      return resultado;
    }
  }
  // Documentos ya reportados en un evento recibido: se envían uno a uno
  let q2 = sb
    .from("dte_documentos")
    .select("id, dte_eventos!dte_documentos_contingencia_id_fkey(estado)")
    .eq("ambiente", ambiente)
    .eq("estado", "contingencia")
    .not("contingencia_id", "is", null)
    .order("created_at")
    .limit(40);
  if (soloPruebas !== undefined) q2 = q2.eq("prueba", soloPruebas);
  const { data: listos } = await q2;
  for (const x of listos ?? []) {
    const ev = x.dte_eventos as unknown as { estado: string } | null;
    if (ev?.estado !== "procesado") continue;
    const r = await transmitir(x.id as string, usuario).catch((e) => ({ estado: "error", mensaje: String(e) }));
    if (r.estado === "procesado") resultado.enviados++;
    else resultado.rechazados++;
  }
  return resultado;
}

// ---------------------------------------------------------------------------------------------
// Emitir desde un pedido
// ---------------------------------------------------------------------------------------------
export async function emitirPedido(p: {
  pedidoId: string;
  tipo: "01" | "03";
  /** crédito fiscal: datos del cliente (si no, se usan los guardados en el cliente) */
  fiscales?: DatosFiscales | null;
  observaciones?: string | null;
  usuario: string;
}): Promise<ResultadoEmision> {
  const { cfg, emisor } = await emisorListo();
  if (!cfg.activo) throw new ErrorDte("La facturación electrónica propia está apagada (Panel → Facturación).");
  const ambiente = ambienteActual();
  const sb = createServiceClient();
  const ped = await cargarPedido(p.pedidoId);
  if (ped.estado === "cancelado") throw new ErrorDte("El pedido está cancelado.");
  const { data: previos } = await sb
    .from("dte_documentos")
    .select("id, numero_control, estado")
    .eq("pedido_id", ped.id)
    .eq("ambiente", ambiente)
    .in("tipo_dte", ["01", "03"])
    .in("estado", ["pendiente", "procesado", "contingencia"]);
  if (previos?.length) {
    throw new ErrorDte(`Este pedido ya tiene el documento ${previos[0].numero_control} (${previos[0].estado}). Para cambiarlo, anulalo primero.`);
  }
  const lineas = await lineasDelPedido(ped);
  const total = r2(lineas.reduce((s, l) => s + l.precio * l.cantidad - l.descuento, 0));
  const pagos = pagosDelPedido(ped, total);
  const obs = p.observaciones ?? `Pedido #${ped.numero}`;

  let id: string;
  if (p.tipo === "01") {
    const receptor = receptorFacturaDePedido(ped);
    id = await crearDocumento({
      tipo: "01",
      armar: (ident) => armarFactura({ id: ident, emisor, receptor, lineas, pagos, observaciones: obs }),
      emisor,
      ambiente,
      pedidoId: ped.id,
      receptor: { nombre: receptor.nombre, documento: null, correo: receptor.correo },
      usuario: p.usuario,
    });
  } else {
    const fiscales = p.fiscales ?? ped.clientes?.datos_fiscales ?? null;
    const faltan = faltantesFiscales(fiscales);
    if (faltan.length) throw new ErrorDte("Faltan datos del cliente para el crédito fiscal.", faltan);
    const f = fiscales!;
    const receptor: ReceptorFiscal = {
      nit: f.nit,
      nrc: f.nrc,
      nombre: f.nombre,
      nombreComercial: f.nombreComercial,
      codActividad: f.codActividad,
      descActividad: f.descActividad,
      direccion: f.direccion,
      telefono: f.telefono ?? ped.entrega?.telefono ?? null,
      correo: f.correo ?? ped.entrega?.correo ?? null,
    };
    // El cliente queda con sus datos fiscales para la próxima vez
    if (ped.clientes?.id && p.fiscales) await sb.from("clientes").update({ datos_fiscales: p.fiscales }).eq("id", ped.clientes.id);
    id = await crearDocumento({
      tipo: "03",
      armar: (ident) => armarCreditoFiscal({ id: ident, emisor, receptor, lineas, pagos, retiene1: f.retiene1, observaciones: obs }),
      emisor,
      ambiente,
      pedidoId: ped.id,
      receptor: { nombre: f.nombre, documento: `NIT ${soloDigitos(f.nit)}`, correo: receptor.correo },
      usuario: p.usuario,
    });
  }
  return transmitir(id, p.usuario);
}

/**
 * Corrige y reenvía un documento rechazado: se arma otra vez con los datos actuales del pedido,
 * conservando el código de generación y el número de control (Normativa 2.0, regla 1.2).
 */
export async function reintentar(id: string, usuario: string, fiscales?: DatosFiscales | null): Promise<ResultadoEmision> {
  const d = await fila(id);
  if (d.estado !== "rechazado" && d.estado !== "pendiente") throw new ErrorDte("Solo se reintentan documentos rechazados o pendientes.");
  if (d.pedido_id && (d.tipo_dte === "01" || d.tipo_dte === "03") && !d.prueba) {
    const { emisor } = await emisorListo();
    const ped = await cargarPedido(d.pedido_id);
    const lineas = await lineasDelPedido(ped);
    const total = r2(lineas.reduce((s, l) => s + l.precio * l.cantidad - l.descuento, 0));
    const pagos = pagosDelPedido(ped, total);
    const ident: Identificacion = {
      ambiente: d.ambiente,
      numeroControl: d.numero_control,
      codigoGeneracion: d.codigo_generacion,
      fecEmi: d.fec_emi,
      horEmi: d.hor_emi,
    };
    const obs = (d.json.resumen as Json)?.observaciones ?? null;
    let json: Json;
    if (d.tipo_dte === "01") {
      json = armarFactura({ id: ident, emisor, receptor: receptorFacturaDePedido(ped), lineas, pagos, observaciones: obs });
    } else {
      const f = fiscales ?? ped.clientes?.datos_fiscales ?? null;
      const faltan = faltantesFiscales(f);
      if (faltan.length) throw new ErrorDte("Faltan datos del cliente para el crédito fiscal.", faltan);
      if (fiscales && ped.clientes?.id) await createServiceClient().from("clientes").update({ datos_fiscales: fiscales }).eq("id", ped.clientes.id);
      json = armarCreditoFiscal({
        id: ident,
        emisor,
        receptor: { ...f!, telefono: f!.telefono ?? ped.entrega?.telefono ?? null, correo: f!.correo ?? ped.entrega?.correo ?? null },
        lineas,
        pagos,
        retiene1: f!.retiene1,
        observaciones: obs,
      });
    }
    const errores = validarEsquema(d.tipo_dte as Esquema, json);
    if (errores.length) throw new ErrorDte("El documento no cumple el formato de Hacienda.", errores);
    const firma = firmarJws(json, certificadoDelEntorno().llave);
    const resumen = json.resumen as Json;
    await createServiceClient()
      .from("dte_documentos")
      .update({ json, firma, estado: "pendiente", total: Number(resumen.totalPagar), mensaje: null })
      .eq("id", id);
  } else {
    await createServiceClient().from("dte_documentos").update({ estado: "pendiente" }).eq("id", id);
  }
  return transmitir(id, usuario);
}

/** Descarta un documento rechazado que no se va a corregir (queda en el historial). */
export async function descartar(id: string) {
  const d = await fila(id);
  if (d.estado !== "rechazado") throw new ErrorDte("Solo se descartan documentos rechazados.");
  await createServiceClient().from("dte_documentos").update({ estado: "descartado" }).eq("id", id);
}

// ---------------------------------------------------------------------------------------------
// Emisión automática al quedar pagado el pedido (solo producción)
// ---------------------------------------------------------------------------------------------
export function tocaFacturar(p: Pick<PedidoDte, "estado" | "forma_pago" | "pagado_en" | "confirmado_en" | "entregado_en" | "factura_estado">) {
  if (p.factura_estado !== "pendiente") return false;
  if (p.estado === "cancelado" || p.estado === "devuelto") return false;
  if (!p.pagado_en) return false;
  // Contra entrega: la venta ocurre al entregar y cobrar
  if (p.forma_pago === "contra_entrega") return Boolean(p.entregado_en);
  return Boolean(p.confirmado_en);
}

export async function emitirSiCorresponde(pedidoId: string) {
  const cfg = await configDte();
  if (!cfg.activo || !cfg.automatica || ambienteActual() !== "01") return null;
  const ped = await cargarPedido(pedidoId);
  if (!tocaFacturar(ped)) return null;
  const sb = createServiceClient();
  const credito = ped.facturacion?.tipo === "credito_fiscal";
  const nota = async (texto: string) =>
    sb.from("pedido_eventos").insert({ pedido_id: ped.id, estado_anterior: ped.estado, estado_nuevo: ped.estado, nota: texto, usuario: "sistema" });
  if (credito && faltantesFiscales(ped.clientes?.datos_fiscales).length) {
    await nota("Pide crédito fiscal: completá sus datos fiscales (actividad y dirección con códigos de Hacienda) y emitilo desde el pedido.");
    return null;
  }
  try {
    const r = await emitirPedido({ pedidoId, tipo: credito ? "03" : "01", usuario: "sistema" });
    if (r.estado === "rechazado") await nota(`La factura automática fue rechazada por Hacienda: ${r.mensaje}. Revisala en el pedido.`);
    return r;
  } catch (e) {
    await nota(`No se pudo emitir la factura automática: ${e instanceof Error ? e.message : String(e)}${e instanceof ErrorDte && e.detalles.length ? ` (${e.detalles.join("; ")})` : ""}`);
    return null;
  }
}

// ---------------------------------------------------------------------------------------------
// Nota de crédito sobre un crédito fiscal
// ---------------------------------------------------------------------------------------------
export async function emitirNotaCredito(p: {
  ccfId: string;
  /** por línea del crédito fiscal (numItem): cuántas unidades se devuelven */
  cantidades: Record<number, number>;
  motivo: string;
  usuario: string;
  prueba?: boolean;
}): Promise<ResultadoEmision> {
  const { emisor } = await emisorListo();
  const ccf = await fila(p.ccfId);
  if (ccf.tipo_dte !== "03") throw new ErrorDte("La nota de crédito se aplica a un comprobante de crédito fiscal.");
  if (ccf.estado !== "procesado") throw new ErrorDte("El crédito fiscal todavía no está recibido por Hacienda (o está anulado).");
  const limite = new Date(`${ccf.fec_emi}T00:00:00-06:00`);
  limite.setMonth(limite.getMonth() + 3);
  if (Date.now() > limite.getTime()) throw new ErrorDte("Pasaron más de 3 meses desde el crédito fiscal: ya no se puede emitir la nota de crédito.");
  const j = ccf.json;
  const items = j.cuerpoDocumento as Json[];
  const lineas: LineaNota[] = [];
  for (const it of items) {
    const n = Number(p.cantidades[it.numItem] ?? 0);
    if (!(n > 0)) continue;
    if (n > Number(it.cantidad)) throw new ErrorDte(`La línea ${it.numItem} solo tiene ${it.cantidad} unidades.`);
    lineas.push({
      codigo: it.codigo,
      descripcion: it.descripcion,
      cantidad: n,
      precioUni: Number(it.precioUni),
      montoDescu: (Number(it.montoDescu) * n) / Number(it.cantidad),
      tipoItem: it.tipoItem,
      uniMedida: it.uniMedida,
    });
  }
  if (!lineas.length) throw new ErrorDte("Elegí al menos una línea y cuántas unidades se devuelven.");
  // No puede pasar del valor del crédito fiscal, sumando las notas anteriores
  const { data: previas } = await createServiceClient()
    .from("dte_documentos")
    .select("json")
    .eq("relacionado_id", ccf.id)
    .eq("tipo_dte", "05")
    .in("estado", ["pendiente", "procesado", "contingencia"]);
  const yaRebajado = (previas ?? []).reduce((s, x) => s + Number((x.json as Json).resumen?.totalGravada ?? 0), 0);
  const estaNota = lineas.reduce((s, l) => s + l.precioUni * l.cantidad - l.montoDescu, 0);
  if (r2(yaRebajado + estaNota) > Number(j.resumen.totalGravada) + 0.01) {
    throw new ErrorDte("Con las notas de crédito anteriores, esta pasa del valor del crédito fiscal.");
  }
  const r = j.receptor as Json;
  const receptor: ReceptorFiscal = {
    nit: r.nit,
    nrc: r.nrc,
    nombre: r.nombre,
    nombreComercial: r.nombreComercial,
    codActividad: r.codActividad,
    descActividad: r.descActividad,
    direccion: r.direccion,
    telefono: r.telefono,
    correo: r.correo,
  };
  const id = await crearDocumento({
    tipo: "05",
    armar: (ident) =>
      armarNotaCredito({
        id: ident,
        emisor,
        receptor,
        ccf: { codigoGeneracion: ccf.codigo_generacion, fecEmi: ccf.fec_emi },
        lineas,
        retiene1: Number(j.resumen.ivaRete) > 0,
        observaciones: p.motivo,
      }),
    emisor,
    ambiente: ccf.ambiente,
    pedidoId: ccf.pedido_id,
    relacionadoId: ccf.id,
    receptor: { nombre: r.nombre, documento: `NIT ${r.nit}`, correo: r.correo },
    usuario: p.usuario,
    prueba: p.prueba ?? ccf.prueba,
  });
  return transmitir(id, p.usuario);
}

// ---------------------------------------------------------------------------------------------
// Invalidación (anular un documento ya recibido)
// ---------------------------------------------------------------------------------------------
export async function invalidar(p: {
  documentoId: string;
  tipo: 1 | 2 | 3;
  motivo: string;
  /** tipos 1 y 3: documento que lo reemplaza (ya recibido por Hacienda) */
  reemplazoId?: string | null;
  solicita?: { nombre: string; tipoDoc: string; numDoc: string } | null;
  usuario: string;
}): Promise<{ ok: boolean; mensaje: string }> {
  const { emisor } = await emisorListo();
  const sb = createServiceClient();
  const d = await fila(p.documentoId);
  if (d.estado !== "procesado" || !d.sello_recibido) throw new ErrorDte("Solo se anulan documentos recibidos por Hacienda.");
  if (!p.motivo.trim()) throw new ErrorDte("Escribí el motivo de la anulación.");
  let reemplazo: FilaDte | null = null;
  if (p.tipo !== 2 && d.tipo_dte !== "05") {
    if (!p.reemplazoId) throw new ErrorDte("Para este tipo de anulación primero emití el documento correcto que lo reemplaza.");
    reemplazo = await fila(p.reemplazoId);
    if (reemplazo.estado !== "procesado") throw new ErrorDte("El documento que lo reemplaza todavía no está recibido por Hacienda.");
  }
  if (d.tipo_dte === "03") {
    const { data: notas } = await sb.from("dte_documentos").select("numero_control").eq("relacionado_id", d.id).eq("tipo_dte", "05").eq("estado", "procesado");
    if (notas?.length) throw new ErrorDte(`Primero anulá la nota de crédito ${notas[0].numero_control}: el crédito fiscal tiene notas aplicadas.`);
  }
  // Plazo: factura 3 meses desde el sello; crédito fiscal y nota de crédito, hasta el día 10 hábil del mes siguiente
  const ahora = ahoraSV();
  // Fecha del evento: en crédito fiscal y nota de crédito debe ser la misma del documento
  const fecEvento = d.tipo_dte === "01" ? ahora.fecha : d.fec_emi;
  const r = d.json.receptor as Json | null;
  const docReceptor =
    d.tipo_dte === "03"
      ? { tipoDocumento: "36", numDocumento: r?.nit ?? null }
      : { tipoDocumento: r?.tipoDocumento ?? null, numDocumento: r?.numDocumento ?? null };
  const codigo = randomUUID().toUpperCase();
  const json = armarInvalidacion({
    ambiente: d.ambiente,
    codigoGeneracion: codigo,
    fecEmi: fecEvento,
    horEmi: ahora.hora,
    emisor,
    documento: {
      tipoDte: d.tipo_dte,
      codigoGeneracion: d.codigo_generacion,
      selloRecibido: d.sello_recibido,
      numeroControl: d.numero_control,
      fecEmi: d.fec_emi,
      ...docReceptor,
      nombre: r?.nombre ?? null,
      telefono: r?.telefono ?? null,
      correo: r?.correo ?? null,
    },
    tipo: p.tipo,
    reemplazo: reemplazo?.codigo_generacion ?? null,
    motivo: p.motivo,
    solicita: p.solicita ?? emisor.responsable,
  });
  const errores = validarEsquema("invalidacion", json);
  if (errores.length) throw new ErrorDte("La anulación no cumple el formato de Hacienda.", errores);
  const firma = firmarJws(json, certificadoDelEntorno().llave);
  const { data: ev, error } = await sb
    .from("dte_eventos")
    .insert({
      ambiente: d.ambiente,
      tipo: "invalidacion",
      version: VERSION_INVALIDACION,
      codigo_generacion: codigo,
      json,
      firma,
      documento_id: d.id,
      reemplazo_id: reemplazo?.id ?? null,
      prueba: d.prueba,
      creado_por: p.usuario,
    })
    .select("id")
    .single();
  if (error || !ev) throw new ErrorDte(`No se pudo guardar la anulación: ${error?.message}`);
  let res: RespuestaMH;
  try {
    res = await transmitirInvalidacion({ ambiente: d.ambiente, version: VERSION_INVALIDACION, firmado: firma });
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : String(e);
    await sb.from("dte_eventos").update({ mensaje }).eq("id", ev.id);
    return { ok: false, mensaje: `${mensaje} La anulación quedó guardada; intentá de nuevo en unos minutos.` };
  }
  if (res.estado !== "PROCESADO" || !res.selloRecibido) {
    await sb.from("dte_eventos").update({ estado: "rechazado", mensaje: textoRespuesta(res), observaciones: res.observaciones, respuesta: res.bruta }).eq("id", ev.id);
    return { ok: false, mensaje: `Hacienda rechazó la anulación: ${textoRespuesta(res)}${res.observaciones.length ? ` (${res.observaciones.join("; ")})` : ""}` };
  }
  await sb
    .from("dte_eventos")
    .update({ estado: "procesado", sello_recibido: res.selloRecibido, fh_procesamiento: fechaMH(res.fhProcesamiento), mensaje: textoRespuesta(res), respuesta: res.bruta })
    .eq("id", ev.id);
  await sb.from("dte_documentos").update({ estado: "invalidado" }).eq("id", d.id);
  if (d.pedido_id && d.ambiente === "01" && !d.prueba && (d.tipo_dte === "01" || d.tipo_dte === "03")) {
    const { data: ped } = await sb.from("pedidos").select("estado").eq("id", d.pedido_id).single();
    await sb
      .from("pedidos")
      .update(
        reemplazo
          ? { factura_estado: "emitida", factura_numero: reemplazo.numero_control }
          : { factura_estado: "no_aplica", factura_numero: null }
      )
      .eq("id", d.pedido_id);
    await sb.from("pedido_eventos").insert({
      pedido_id: d.pedido_id,
      estado_anterior: ped?.estado,
      estado_nuevo: ped?.estado,
      nota: `${TIPO_DTE[d.tipo_dte]} ${d.numero_control} anulada ante Hacienda: ${p.motivo}${reemplazo ? ` (la reemplaza ${reemplazo.numero_control})` : ""}`,
      usuario: p.usuario,
    });
  }
  if (d.ambiente === "01" && !d.prueba) after(() => avisarInvalidacion(ev.id).catch((e) => console.error("avisarInvalidacion", e)));
  return { ok: true, mensaje: `Anulado. Sello de Hacienda: ${res.selloRecibido}` };
}

// ---------------------------------------------------------------------------------------------
// Entrega al cliente (correo con PDF y JSON) y descargas
// ---------------------------------------------------------------------------------------------
async function marcoCorreo(): Promise<Marco> {
  const c = await configTienda();
  return {
    sitio: SITE_URL,
    whatsapp: enlaceWhatsAppA(c.whatsapp, "Hola, tengo una consulta sobre mi factura. [correo]"),
    negocio: { nombre: c.negocio.nombre || "Nera Tech", nit: c.negocio.nit, direccion: c.negocio.direccion },
  };
}

async function enlacePedido(pedidoId: string | null) {
  if (!pedidoId) return { enlace: null, numero: null };
  const { data } = await createServiceClient().from("pedidos").select("numero, token").eq("id", pedidoId).maybeSingle();
  return data ? { enlace: `${SITE_URL}/pedido/${data.token}`, numero: data.numero as number } : { enlace: null, numero: null };
}

/** PDF y JSON de un documento (para correo y descargas). */
export async function archivosDte(id: string) {
  const d = await fila(id);
  const { enlace } = await enlacePedido(d.pedido_id);
  const pdf = await pdfDte({ json: d.json, selloRecibido: d.sello_recibido, estado: d.estado, enlace: enlace?.replace(/^https?:\/\//, "") ?? null });
  return { d, pdf, json: archivoDte(d.json, d.firma, d.sello_recibido) };
}

export async function enviarDteCliente(id: string, para?: string): Promise<{ enviado: boolean; motivo?: string }> {
  const { d, pdf, json } = await archivosDte(id);
  const correo = para ?? d.receptor_correo ?? (d.json.receptor as Json)?.correo;
  if (!correo) return { enviado: false, motivo: "El documento no tiene correo del cliente." };
  const { enlace, numero } = await enlacePedido(d.pedido_id);
  const c = correoDte(await marcoCorreo(), {
    tipo: TIPO_DTE[d.tipo_dte],
    nombre: d.receptor_nombre,
    numeroControl: d.numero_control,
    codigoGeneracion: d.codigo_generacion,
    total: Number(d.total),
    pedido: numero,
    enlace,
    contingencia: d.estado === "contingencia",
    prueba: d.ambiente === "00",
  });
  const r = await enviarCorreo({
    para: correo,
    nombrePara: d.receptor_nombre ?? undefined,
    asunto: c.asunto,
    html: c.html,
    texto: c.texto,
    etiqueta: "factura-electronica",
    adjuntos: [
      { nombre: `${d.codigo_generacion}.pdf`, contenido: pdf },
      { nombre: `${d.codigo_generacion}.json`, contenido: json },
    ],
  });
  const sb = createServiceClient();
  if (r.enviado) await sb.from("dte_documentos").update({ correo_enviado_en: new Date().toISOString() }).eq("id", id);
  if (d.pedido_id) {
    const { data: ped } = await sb.from("pedidos").select("estado").eq("id", d.pedido_id).single();
    await sb.from("pedido_eventos").insert({
      pedido_id: d.pedido_id,
      estado_anterior: ped?.estado,
      estado_nuevo: ped?.estado,
      nota: r.enviado ? `Correo al cliente con la ${TIPO_DTE[d.tipo_dte].toLowerCase()} ${d.numero_control} (PDF y JSON)` : `No se envió la factura por correo: ${r.motivo}`,
      usuario: "correo",
    });
  }
  return r;
}

async function avisarInvalidacion(eventoId: string) {
  const sb = createServiceClient();
  const { data: ev } = await sb.from("dte_eventos").select("*").eq("id", eventoId).single();
  if (!ev?.documento_id) return;
  const d = await fila(ev.documento_id as string);
  const correo = d.receptor_correo ?? (d.json.receptor as Json)?.correo;
  if (!correo) return;
  const { numero } = await enlacePedido(d.pedido_id);
  const reemplazo = ev.reemplazo_id ? (await fila(ev.reemplazo_id as string)).numero_control : null;
  const c = correoDteInvalidado(await marcoCorreo(), {
    tipo: TIPO_DTE[d.tipo_dte],
    numeroControl: d.numero_control,
    motivo: String((ev.json as Json).motivo?.motivoAnulacion ?? "Anulación"),
    reemplazo,
    pedido: numero,
  });
  await enviarCorreo({
    para: correo,
    asunto: c.asunto,
    html: c.html,
    texto: c.texto,
    etiqueta: "factura-anulada",
    adjuntos: [{ nombre: `${ev.codigo_generacion}.json`, contenido: JSON.stringify({ ...(ev.json as Json), firmaElectronica: ev.firma, selloRecibido: ev.sello_recibido }) }],
  });
}

export { ErrorFirma, ErrorMH };

/**
 * Revisión diaria (cron): reporta y envía lo que quedó en contingencia y emite las facturas
 * automáticas que se hayan quedado sin emitir (por ejemplo, si Hacienda estaba caída).
 */
export async function revisionDiariaDte() {
  const cfg = await configDte();
  if (!cfg.activo) return { activo: false };
  const ambiente = ambienteActual();
  const contingencia = await procesarContingencias(ambiente, "sistema", false).catch((e) => ({ error: String(e) }));
  let emitidas = 0;
  if (cfg.automatica && ambiente === "01") {
    const hace30 = new Date(Date.now() - 30 * 86400_000).toISOString();
    const { data } = await createServiceClient()
      .from("pedidos")
      .select("id")
      .eq("factura_estado", "pendiente")
      .not("pagado_en", "is", null)
      .gte("pagado_en", hace30)
      .limit(20);
    for (const p of data ?? []) {
      const r = await emitirSiCorresponde(p.id as string).catch(() => null);
      if (r?.estado === "procesado") emitidas++;
    }
  }
  return { activo: true, contingencia, emitidas };
}
