import { createHash, createPrivateKey, createPublicKey, createSign, createVerify, type KeyObject } from "node:crypto";

// Firma electrónica de Hacienda (Manual tecnológico 2.0, sección 2): el documento va como un JWS compacto
// firmado con RS512 (RSA + SHA-512) usando la llave privada del certificado que se descarga del portal
// de facturación de Hacienda. Hacienda ofrece un "firmador" en Java/Docker; aquí se hace lo mismo en el
// servidor de la tienda, sin instalar nada.
//
// El certificado de Hacienda es un archivo .crt en XML (<CertificadoMH>) con:
//   <privateKey><encodied>BASE64 (PKCS#8 DER)</encodied><clave>SHA-512 de la contraseña de la llave</clave></privateKey>
//   <publicKey><encodied>BASE64 (X.509 DER)</encodied></publicKey>
// La contraseña de la llave se comprueba contra ese SHA-512 antes de firmar (igual que el firmador oficial).

export class ErrorFirma extends Error {}

export type Certificado = { nit: string | null; llave: KeyObject; publica: KeyObject | null };

const etiqueta = (xml: string, ruta: string[]): string | null => {
  let resto = xml;
  for (const nombre of ruta) {
    const m = resto.match(new RegExp(`<${nombre}(?:\\s[^>]*)?>([\\s\\S]*?)</${nombre}>`));
    if (!m) return null;
    resto = m[1];
  }
  return resto.trim();
};

/** Acepta el XML tal cual o en base64 (así se puede pegar en una sola línea en Vercel). */
export function textoCertificado(valor: string): string {
  const limpio = valor.trim();
  if (limpio.startsWith("<")) return limpio;
  const decodificado = Buffer.from(limpio.replace(/\s+/g, ""), "base64").toString("utf8").trim();
  if (!decodificado.startsWith("<")) throw new ErrorFirma("El certificado no se reconoce: pegá el archivo .crt completo o en base64.");
  return decodificado;
}

export function leerCertificado(valor: string, contrasena: string): Certificado {
  const xml = textoCertificado(valor);
  const privada = etiqueta(xml, ["privateKey", "encodied"]);
  const hash = etiqueta(xml, ["privateKey", "clave"]);
  if (!privada) throw new ErrorFirma("El certificado no trae la llave privada (privateKey).");
  if (hash) {
    const calculado = createHash("sha512").update(contrasena, "utf8").digest("hex");
    if (calculado.toLowerCase() !== hash.toLowerCase()) {
      throw new ErrorFirma("La contraseña de la llave privada no coincide con el certificado.");
    }
  }
  let llave: KeyObject;
  try {
    llave = createPrivateKey({ key: Buffer.from(privada.replace(/\s+/g, ""), "base64"), format: "der", type: "pkcs8" });
  } catch {
    throw new ErrorFirma("No se pudo leer la llave privada del certificado.");
  }
  const pub = etiqueta(xml, ["publicKey", "encodied"]);
  let publica: KeyObject | null = null;
  try {
    publica = pub ? createPublicKey({ key: Buffer.from(pub.replace(/\s+/g, ""), "base64"), format: "der", type: "spki" }) : null;
  } catch {
    publica = null;
  }
  return { nit: etiqueta(xml, ["nit"]), llave, publica };
}

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");

/** JWS compacto: base64url({"alg":"RS512"}).base64url(JSON).firma */
export function firmarJws(documento: unknown, llave: KeyObject): string {
  const cabecera = b64url(JSON.stringify({ alg: "RS512" }));
  const cuerpo = b64url(JSON.stringify(documento));
  const firma = createSign("RSA-SHA512").update(`${cabecera}.${cuerpo}`).sign(llave);
  return `${cabecera}.${cuerpo}.${b64url(firma)}`;
}

/** Comprueba una firma (para pruebas y para revisar que el certificado y la llave hacen pareja). */
export function verificarJws(jws: string, publica: KeyObject): unknown | null {
  const [cabecera, cuerpo, firma] = jws.split(".");
  if (!cabecera || !cuerpo || !firma) return null;
  const ok = createVerify("RSA-SHA512").update(`${cabecera}.${cuerpo}`).verify(publica, Buffer.from(firma, "base64url"));
  return ok ? JSON.parse(Buffer.from(cuerpo, "base64url").toString("utf8")) : null;
}

/** Certificado y contraseñas desde Vercel (nunca se guardan en la base ni se muestran). */
export function certificadoDelEntorno(): Certificado {
  const cert = process.env.DTE_CERTIFICADO;
  const clave = process.env.DTE_CLAVE_PRIVADA;
  if (!cert) throw new ErrorFirma("Falta DTE_CERTIFICADO en Vercel (el archivo .crt que descargaste de Hacienda).");
  if (!clave) throw new ErrorFirma("Falta DTE_CLAVE_PRIVADA en Vercel (la contraseña de la llave privada del certificado).");
  const c = leerCertificado(cert, clave);
  if (c.publica) {
    // La llave privada y la pública del certificado tienen que ser pareja
    const prueba = firmarJws({ prueba: true }, c.llave);
    if (!verificarJws(prueba, c.publica)) throw new ErrorFirma("La llave privada no corresponde a la pública del certificado.");
  }
  return c;
}
