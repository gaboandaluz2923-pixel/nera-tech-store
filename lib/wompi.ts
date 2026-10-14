import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Conexión con Wompi El Salvador (https://docs.wompi.sv).
// Las claves viven solo en Vercel (WOMPI_CLIENT_ID = App ID, WOMPI_CLIENT_SECRET = API Secret).
// WOMPI_API_URL / WOMPI_ID_URL solo se cambian para pruebas locales.

const URL_TOKEN = `${process.env.WOMPI_ID_URL ?? "https://id.wompi.sv"}/connect/token`;
const URL_API = process.env.WOMPI_API_URL ?? "https://api.wompi.sv";

let guardado: { token: string; vence: number } | null = null;

export class ErrorWompi extends Error {}

const secreto = () => {
  const s = process.env.WOMPI_CLIENT_SECRET?.trim();
  if (!s) throw new ErrorWompi("Falta WOMPI_CLIENT_SECRET en Vercel.");
  return s;
};

/** Pide (o reutiliza) el token de acceso. Wompi lo da por 1 hora; se renueva 5 minutos antes. */
export async function tokenWompi(): Promise<string> {
  if (guardado && Date.now() < guardado.vence) return guardado.token;
  const id = process.env.WOMPI_CLIENT_ID?.trim();
  if (!id) throw new ErrorWompi("Faltan WOMPI_CLIENT_ID o WOMPI_CLIENT_SECRET en Vercel.");

  const r = await fetch(URL_TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      audience: "wompi_api",
      client_id: id,
      client_secret: secreto(),
    }),
    cache: "no-store",
  });
  const datos = (await r.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string };
  if (!r.ok || !datos.access_token) {
    throw new ErrorWompi(
      datos.error === "invalid_client"
        ? "Wompi no reconoce las claves: revisá que App ID y API Secret estén bien copiados."
        : `Wompi respondió ${r.status}${datos.error ? ` (${datos.error})` : ""}.`
    );
  }
  guardado = { token: datos.access_token, vence: Date.now() + ((datos.expires_in ?? 3600) - 300) * 1000 };
  return guardado.token;
}

async function api<T>(ruta: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const r = await fetch(`${URL_API}${ruta}`, {
    method: init?.method ?? "GET",
    headers: { authorization: `Bearer ${await tokenWompi()}`, "content-type": "application/json" },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  const texto = await r.text();
  if (!r.ok) throw new ErrorWompi(`Wompi ${ruta} respondió ${r.status}: ${texto.slice(0, 300)}`);
  return (texto ? JSON.parse(texto) : {}) as T;
}

export type EnlaceCreado = { idEnlace: number; urlEnlace: string; urlQrCodeEnlace?: string; estaProductivo?: boolean };

/** Crea un enlace de pago de un solo uso para un pedido. */
export function crearEnlacePago(p: {
  identificador: string;
  monto: number;
  nombre: string;
  descripcion?: string;
  urlRedirect: string;
  urlWebhook: string;
  urlRetorno?: string;
}) {
  return api<EnlaceCreado>("/EnlacePago", {
    method: "POST",
    body: {
      identificadorEnlaceComercio: p.identificador,
      monto: Math.round(p.monto * 100) / 100,
      nombreProducto: p.nombre.slice(0, 500),
      formaPago: {
        permitirTarjetaCreditoDebido: true,
        permitirPagoConPuntoAgricola: false,
        permitirPagoEnCuotasAgricola: false,
        permitirPagoEnBitcoin: false,
        permitePagoQuickPay: false,
      },
      infoProducto: p.descripcion ? { descripcionProducto: p.descripcion.slice(0, 1000) } : undefined,
      configuracion: {
        urlRedirect: p.urlRedirect,
        urlRetorno: p.urlRetorno,
        urlWebhook: p.urlWebhook,
        esMontoEditable: false,
        esCantidadEditable: false,
        cantidadPorDefecto: 1,
        duracionInterfazIntentoMinutos: 30,
        notificarTransaccionCliente: true,
      },
      limitesDeUso: { cantidadMaximaPagosExitosos: 1 },
    },
  });
}

export type Transaccion = {
  idTransaccion: string;
  esAprobada: boolean;
  esReal?: boolean;
  monto?: number;
  montoOriginal?: number;
  codigoAutorizacion?: string;
  mensaje?: string;
};

/** Consulta una transacción en Wompi (fuente de verdad para saber si se aprobó). */
export function consultarTransaccion(idTransaccion: string) {
  if (!/^[0-9a-zA-Z-]{8,64}$/.test(idTransaccion)) throw new ErrorWompi("Id de transacción no válido.");
  return api<Transaccion>(`/TransaccionCompra/${encodeURIComponent(idTransaccion)}`);
}

function hmac(texto: string) {
  return createHmac("sha256", secreto()).update(texto, "utf8").digest("hex");
}

function iguales(a: string, b: string) {
  const x = Buffer.from(a.toLowerCase());
  const y = Buffer.from(b.toLowerCase());
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Valida el hash que Wompi agrega al regresar al cliente desde un enlace de pago. */
export function hashRegresoValido(q: {
  identificadorEnlaceComercio: string;
  idTransaccion: string;
  idEnlace: string;
  monto: string;
  hash: string;
}) {
  if (!q.hash) return false;
  return iguales(hmac(`${q.identificadorEnlaceComercio}${q.idTransaccion}${q.idEnlace}${q.monto}`), q.hash);
}

/** Valida el encabezado wompi_hash del webhook (HMAC del cuerpo tal como llegó). */
export function hashWebhookValido(cuerpo: string, hash: string | null) {
  if (!hash) return false;
  return iguales(hmac(cuerpo), hash);
}

/** Datos del negocio en Wompi; estaProductivo = false significa modo pruebas (no cobra de verdad). */
export function datosNegocio() {
  return api<{ estaProductivo?: boolean; nombre?: string; nombreNegocio?: string }>("/Aplicativo");
}
