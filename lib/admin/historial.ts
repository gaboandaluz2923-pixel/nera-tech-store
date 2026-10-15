import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NOMBRE_CARACTERISTICA } from "@/lib/tienda/formato";

// Historial de cambios con nombre (tabla historial, migración 0008) y nombres del equipo
// para mostrar "Angel" en vez del correo en pedidos, productos y clientes.

export type FilaHistorial = {
  id: number;
  tabla: string;
  registro_id: string;
  accion: "creado" | "cambiado" | "borrado";
  campos: string[];
  antes: Record<string, unknown> | null;
  despues: Record<string, unknown> | null;
  usuario: string | null;
  created_at: string;
};

/** correo → nombre de todo el equipo */
export async function nombresEquipo(supabase: SupabaseClient): Promise<Map<string, string>> {
  const { data } = await supabase.from("equipo").select("correo, nombre");
  return new Map((data ?? []).filter((e) => e.nombre).map((e) => [String(e.correo), String(e.nombre)]));
}

/** "Angel", "Cliente", "Tienda" o el correo si no tiene nombre */
export function quien(usuario: string | null | undefined, nombres: Map<string, string>): string {
  if (!usuario) return "—";
  if (usuario === "cliente") return "Cliente";
  if (usuario === "tienda") return "Tienda (automático)";
  if (usuario === "base de datos") return "Carga por SQL";
  return nombres.get(usuario.toLowerCase()) ?? usuario;
}

const CAMPO: Record<string, string> = {
  nombre: "nombre",
  slug: "dirección",
  marca: "marca",
  categoria_id: "categoría",
  resumen: "resumen",
  descripcion: "descripción",
  caracteristicas: "características",
  incluye: "qué trae la caja",
  faq: "preguntas frecuentes",
  estado: "estado",
  orden: "orden",
  meta_titulo: "título para Google",
  meta_descripcion: "descripción para Google",
  publicado_en: "fecha de publicación",
  color: "color",
  stock: "stock en bodega",
  precio: "precio",
  activo: "se muestra",
  telefono: "teléfono",
  telefono_alterno: "teléfono alterno",
  correo: "correo",
  direccion: "dirección",
  etiquetas: "etiquetas",
  acepta_whatsapp: "acepta WhatsApp",
  acepta_correo: "acepta correos",
  ofertas_elegido_en: "preferencia de publicidad",
  cumple_dia: "cumpleaños",
  cumple_mes: "cumpleaños",
  auth_user_id: "cuenta de Google",
  origen: "origen",
  url: "foto",
  memoria: "memoria",
  ram_gb: "RAM",
  almacenamiento_gb: "almacenamiento",
  sku: "código",
  clave: "clave",
};
const ESTADOS: Record<string, string> = { activo: "Publicado", agotado: "Agotado", oculto: "Oculto" };

function corto(campo: string, v: unknown): string | null {
  if (v === null || v === undefined || v === "") return "vacío";
  if (typeof v === "boolean") return v ? "sí" : "no";
  if (typeof v === "number") return campo === "precio" ? `$${v.toFixed(2)}` : String(v);
  if (typeof v === "string") {
    if (campo === "estado") return ESTADOS[v] ?? v;
    if (/_id$/.test(campo) || /^\d{4}-\d\d-\d\dT/.test(v)) return null;
    return v.length <= 40 ? `"${v}"` : null;
  }
  if (Array.isArray(v) && v.every((x) => typeof x === "string")) return v.length ? v.join(", ") : "ninguna";
  return null;
}

/** Texto de un cambio: "cambió stock en bodega (3 → 5)", "subió una foto", "creó la variante"… */
export function describir(f: FilaHistorial, etiquetaVariante?: string): string {
  const sobre =
    f.tabla === "variantes" ? ` la variante ${etiquetaVariante ?? ""}`.trimEnd() : f.tabla === "imagenes" ? " una foto" : "";
  if (f.accion === "creado") return f.tabla === "imagenes" ? "subió una foto" : f.tabla === "productos" ? "creó el producto" : `creó${sobre || " el registro"}`;
  if (f.accion === "borrado") return f.tabla === "imagenes" ? "quitó una foto" : `borró${sobre}`;
  const partes = [...new Set(f.campos.map((c) => c.replace(/^cumple_(dia|mes)$/, "cumple")))].map((c) => {
    const campo = c === "cumple" ? "cumple_dia" : c;
    const nombre = CAMPO[campo] ?? NOMBRE_CARACTERISTICA[campo] ?? campo.replace(/_/g, " ");
    const a = corto(campo, f.antes?.[campo]);
    const d = corto(campo, f.despues?.[campo]);
    return a !== null && d !== null ? `${nombre} (${a} → ${d})` : nombre;
  });
  return `cambió ${partes.join(", ")}${f.tabla === "variantes" ? ` de${sobre}` : ""}`;
}
