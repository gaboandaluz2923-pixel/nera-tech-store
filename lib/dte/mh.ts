import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { soloDigitos } from "./catalogos";

// API del Sistema de Transmisión de Hacienda (Manual tecnológico 2.0, sección 4).
// Usuario y contraseña de la API van en Vercel (DTE_API_USUARIO = NIT sin guiones, DTE_API_CLAVE).
// El token se pide una vez y se guarda (24 h en producción, 48 h en pruebas) en la tabla dte_sesion,
// que solo lee el servidor.

export type Ambiente = "00" | "01";

const BASE_MH: Record<Ambiente, string> = {
  "00": "https://apitest.dtes.mh.gob.sv",
  "01": "https://api.dtes.mh.gob.sv",
};
/** DTE_API_URL solo sirve para probar el ambiente 00 contra un simulador; en Vercel no se define */
const base = (a: Ambiente) => (a === "00" && process.env.DTE_API_URL ? process.env.DTE_API_URL.replace(/\/$/, "") : BASE_MH[a]);
const AGENTE = "NeraTech/1.0 (neratechsv.com)";
/** Política de reintentos: Hacienda debe responder en 8 segundos */
const ESPERA_MS = 8_000;

export class ErrorMH extends Error {
  /** true = no hubo respuesta (sin conexión, Hacienda caída o se pasó el tiempo): aplica contingencia */
  sinRespuesta: boolean;
  constructor(mensaje: string, sinRespuesta = false) {
    super(mensaje);
    this.sinRespuesta = sinRespuesta;
  }
}

/** Ambiente con el que están cargadas las claves en Vercel: 00 pruebas (por defecto), 01 producción. */
export function ambienteActual(): Ambiente {
  return process.env.DTE_AMBIENTE?.trim() === "01" ? "01" : "00";
}

async function llamar(url: string, init: RequestInit): Promise<{ status: number; cuerpo: Record<string, unknown> | null; texto: string }> {
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), ESPERA_MS);
  try {
    const r = await fetch(url, {
      ...init,
      headers: { "User-Agent": AGENTE, ...(init.headers ?? {}) },
      signal: control.signal,
      cache: "no-store",
    });
    const texto = await r.text();
    let cuerpo: Record<string, unknown> | null = null;
    try {
      cuerpo = texto ? JSON.parse(texto) : null;
    } catch {
      cuerpo = null;
    }
    // 5xx = Hacienda con problemas (para la política de reintentos cuenta como sin respuesta)
    if (r.status >= 500) throw new ErrorMH(`Hacienda respondió ${r.status}`, true);
    return { status: r.status, cuerpo, texto };
  } catch (e) {
    if (e instanceof ErrorMH) throw e;
    const abortado = e instanceof Error && e.name === "AbortError";
    throw new ErrorMH(abortado ? "Hacienda no respondió en 8 segundos." : "No se pudo conectar con Hacienda.", true);
  } finally {
    clearTimeout(reloj);
  }
}

async function pedirToken(ambiente: Ambiente): Promise<string> {
  const usuario = soloDigitos(process.env.DTE_API_USUARIO);
  const clave = process.env.DTE_API_CLAVE ?? "";
  if (!usuario || !clave) throw new ErrorMH("Faltan DTE_API_USUARIO o DTE_API_CLAVE en Vercel.");
  const { cuerpo, texto } = await llamar(`${base(ambiente)}/seguridad/auth`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ user: usuario, pwd: clave }).toString(),
  });
  const body = (cuerpo?.body ?? {}) as { token?: string; mensaje?: string };
  if (cuerpo?.status !== "OK" || !body.token) {
    const motivo = (cuerpo?.message as string) || body.mensaje || texto.slice(0, 160) || "sin detalle";
    // Ojo: 3 intentos fallidos bloquean el usuario de la API
    throw new ErrorMH(`Hacienda no aceptó el usuario o la contraseña de la API: ${motivo}`);
  }
  const token = body.token.startsWith("Bearer ") ? body.token : `Bearer ${body.token}`;
  const horas = ambiente === "01" ? 20 : 44;
  await createServiceClient()
    .from("dte_sesion")
    .upsert({ ambiente, token, vence: new Date(Date.now() + horas * 3600_000).toISOString(), updated_at: new Date().toISOString() });
  return token;
}

async function token(ambiente: Ambiente, renovar = false): Promise<string> {
  if (!renovar) {
    const { data } = await createServiceClient().from("dte_sesion").select("token, vence").eq("ambiente", ambiente).maybeSingle();
    if (data && new Date(data.vence).getTime() > Date.now() + 60_000) return data.token as string;
  }
  return pedirToken(ambiente);
}

/** Llama a un servicio con token; si Hacienda dice que el token ya no sirve, lo renueva una vez. */
async function conToken(ambiente: Ambiente, ruta: string, cuerpo: unknown, metodo: "POST" | "GET" = "POST") {
  for (let intento = 0; intento < 2; intento++) {
    const t = await token(ambiente, intento > 0);
    const r = await llamar(`${base(ambiente)}${ruta}`, {
      method: metodo,
      headers: { Authorization: t, "content-type": "application/json" },
      ...(metodo === "POST" ? { body: JSON.stringify(cuerpo) } : {}),
    });
    if (r.status === 401 || r.status === 403) continue;
    return r;
  }
  throw new ErrorMH("Hacienda rechazó el token aunque se renovó. Revisá el usuario y la contraseña de la API.");
}

export type RespuestaMH = {
  estado: string | null; // PROCESADO | RECHAZADO | RECIBIDO
  codigoGeneracion: string | null;
  selloRecibido: string | null;
  fhProcesamiento: string | null; // dd/MM/yyyy HH:mm:ss
  codigoMsg: string | null;
  descripcionMsg: string | null;
  observaciones: string[];
  bruta: Record<string, unknown> | null;
};

const respuesta = (c: Record<string, unknown> | null, texto: string): RespuestaMH => ({
  estado: (c?.estado as string) ?? null,
  codigoGeneracion: (c?.codigoGeneracion as string) ?? null,
  selloRecibido: (c?.selloRecibido as string) ?? null,
  fhProcesamiento: (c?.fhProcesamiento as string) ?? (c?.fechaHora as string) ?? null,
  codigoMsg: (c?.codigoMsg as string) ?? null,
  descripcionMsg: (c?.descripcionMsg as string) ?? (c?.mensaje as string) ?? (c ? null : texto.slice(0, 300) || null),
  observaciones: Array.isArray(c?.observaciones) ? (c!.observaciones as unknown[]).map(String).filter((x) => x.trim()) : [],
  bruta: c,
});

/** Envía un documento firmado (modelo uno a uno). */
export async function transmitirDte(p: { ambiente: Ambiente; tipoDte: string; version: number; codigoGeneracion: string; firmado: string }) {
  const r = await conToken(p.ambiente, "/fesv/recepciondte", {
    ambiente: p.ambiente,
    idEnvio: Math.floor(Date.now() / 1000) % 2_000_000_000,
    version: p.version,
    tipoDte: p.tipoDte,
    documento: p.firmado,
    codigoGeneracion: p.codigoGeneracion,
  });
  return respuesta(r.cuerpo, r.texto);
}

/** ¿Hacienda ya tiene este documento? (para no enviarlo dos veces cuando no respondió a tiempo) */
export async function consultarDte(p: { ambiente: Ambiente; nitEmisor: string; tipoDte: string; codigoGeneracion: string }) {
  const r = await conToken(p.ambiente, "/fesv/recepcion/consultadte", {
    nitEmisor: soloDigitos(p.nitEmisor),
    tdte: p.tipoDte,
    codigoGeneracion: p.codigoGeneracion,
  });
  return respuesta(r.cuerpo, r.texto);
}

export async function transmitirInvalidacion(p: { ambiente: Ambiente; version: number; firmado: string }) {
  const r = await conToken(p.ambiente, "/fesv/anulardte", {
    ambiente: p.ambiente,
    idEnvio: Math.floor(Date.now() / 1000) % 2_000_000_000,
    version: p.version,
    documento: p.firmado,
  });
  return respuesta(r.cuerpo, r.texto);
}

export async function transmitirContingencia(p: { ambiente: Ambiente; nit: string; firmado: string }) {
  const r = await conToken(p.ambiente, "/fesv/contingencia", { nit: soloDigitos(p.nit), documento: p.firmado });
  return respuesta(r.cuerpo, r.texto);
}

/** Prueba de conexión: pide un token nuevo (no envía documentos). */
export async function probarConexion(ambiente: Ambiente) {
  await pedirToken(ambiente);
}

/** "15/10/2026 19:10:05" (hora de El Salvador) → ISO */
export function fechaMH(s: string | null): string | null {
  const m = s?.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  return new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:${m[6]}-06:00`).toISOString();
}
