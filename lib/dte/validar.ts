import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import contingencia from "./esquemas/contingencia-schema-v4.json";
import ccf from "./esquemas/fe-ccf-v4.json";
import factura from "./esquemas/fe-f-v2.json";
import nc from "./esquemas/fe-nc-v4.json";
import invalidacion from "./esquemas/invalidacion-schema-v3.json";

// Antes de firmar y enviar, cada documento se revisa contra el esquema JSON oficial de Hacienda
// (factura.gob.sv). Así un error de estructura se ve en el panel y no gasta un número de control.

export type Esquema = "01" | "03" | "05" | "invalidacion" | "contingencia";

const ESQUEMAS: Record<Esquema, object> = {
  "01": factura,
  "03": ccf,
  "05": nc,
  invalidacion,
  contingencia,
};

let ajv: Ajv | null = null;
const compilados = new Map<Esquema, ValidateFunction>();

function validador(tipo: Esquema): ValidateFunction {
  const ya = compilados.get(tipo);
  if (ya) return ya;
  if (!ajv) {
    // strict: false porque los esquemas oficiales traen palabras como "minimum" en textos;
    // multipleOfPrecision: los montos con 8 decimales no son múltiplos exactos en binario
    ajv = new Ajv({ allErrors: true, strict: false, multipleOfPrecision: 1 });
    addFormats(ajv);
  }
  // El "$schema" de algunos archivos no es una dirección exacta del borrador 7: se quita
  const { $schema, ...esquema } = ESQUEMAS[tipo] as Record<string, unknown>;
  void $schema;
  const v = ajv.compile(esquema);
  compilados.set(tipo, v);
  return v;
}

const describir = (e: ErrorObject) => {
  const ruta = e.instancePath.replace(/^\//, "").replace(/\//g, ".") || "documento";
  if (e.keyword === "additionalProperties") return `${ruta}: sobra el campo "${(e.params as { additionalProperty: string }).additionalProperty}"`;
  if (e.keyword === "required") return `${ruta}: falta "${(e.params as { missingProperty: string }).missingProperty}"`;
  return `${ruta}: ${e.message ?? e.keyword}`;
};

/** Lista de problemas (vacía si el documento cumple el esquema). */
export function validarEsquema(tipo: Esquema, documento: unknown): string[] {
  const v = validador(tipo);
  if (v(documento)) return [];
  return [...new Set((v.errors ?? []).map(describir))].slice(0, 15);
}
