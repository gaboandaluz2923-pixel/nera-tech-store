import "server-only";

// Conexión con Wompi El Salvador (https://docs.wompi.sv).
// Las claves viven solo en Vercel (WOMPI_CLIENT_ID = App ID, WOMPI_CLIENT_SECRET = API Secret).

const URL_TOKEN = "https://id.wompi.sv/connect/token";
export const URL_API = "https://api.wompi.sv";

let guardado: { token: string; vence: number } | null = null;

export class ErrorWompi extends Error {}

/** Pide (o reutiliza) el token de acceso. Wompi lo da por 1 hora; se renueva 5 minutos antes. */
export async function tokenWompi(): Promise<string> {
  if (guardado && Date.now() < guardado.vence) return guardado.token;
  const id = process.env.WOMPI_CLIENT_ID?.trim();
  const secreto = process.env.WOMPI_CLIENT_SECRET?.trim();
  if (!id || !secreto) throw new ErrorWompi("Faltan WOMPI_CLIENT_ID o WOMPI_CLIENT_SECRET en Vercel.");

  const r = await fetch(URL_TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      audience: "wompi_api",
      client_id: id,
      client_secret: secreto,
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
