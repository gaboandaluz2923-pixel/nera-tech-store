"use server";

import { revalidatePath, updateTag } from "next/cache";
import type { EstadoAccion } from "@/components/admin/formulario-accion";
import { equipo } from "@/lib/admin/sesion";
import { formatoAlmacenamiento, slugDe } from "@/lib/listas/normalizar";
import { avisarStockDespues } from "@/lib/tienda/regalos";
import { ETIQUETA_CATALOGO } from "@/lib/tienda/datos";

// Acciones de la sección Catálogo del panel. Cada una verifica la sesión del equipo,
// guarda, y refresca tanto el panel como la tienda (updateTag).

const BUCKET = "productos";
const texto = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const textoONulo = (v: FormDataEntryValue | null) => texto(v) || null;
const ok = (mensaje: string): EstadoAccion => ({ ok: true, mensaje, vez: Date.now() });
const falla = (mensaje: string): EstadoAccion => ({ ok: false, mensaje, vez: Date.now() });

function refrescar(id?: string) {
  revalidatePath("/admin/catalogo");
  if (id) revalidatePath(`/admin/catalogo/${id}`);
  updateTag(ETIQUETA_CATALOGO);
  // Si algo volvió a tener stock, avisa a quienes pidieron "Avisame cuando haya"
  void avisarStockDespues();
}

// ---------------------------------------------------------------------------
// Datos generales
// ---------------------------------------------------------------------------
export async function guardarDatos(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const id = texto(form.get("id"));
  const nombre = texto(form.get("nombre"));
  if (!id || !nombre) return falla("El nombre no puede quedar vacío.");
  const slug = slugDe(texto(form.get("slug")) || nombre);
  if (!slug) return falla("La dirección (slug) no es válida.");

  const { supabase } = await equipo();
  const { data: repetido } = await supabase.from("productos").select("id").eq("slug", slug).neq("id", id).maybeSingle();
  if (repetido) return falla(`Ya hay otro producto con la dirección "${slug}". Cambiala.`);

  const incluye = texto(form.get("incluye"))
    .split("\n")
    .map((l) => l.replace(/^[-•·]\s*/, "").trim())
    .filter(Boolean)
    .join("\n");

  const { error } = await supabase
    .from("productos")
    .update({
      nombre,
      slug,
      marca: textoONulo(form.get("marca")),
      categoria_id: textoONulo(form.get("categoria_id")),
      resumen: textoONulo(form.get("resumen")),
      descripcion: textoONulo(form.get("descripcion")),
      incluye: incluye || null,
      orden: Math.round(Number(form.get("orden")) || 0),
      meta_titulo: textoONulo(form.get("meta_titulo")),
      meta_descripcion: textoONulo(form.get("meta_descripcion")),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return falla(`No se pudo guardar: ${error.message}`);
  refrescar(id);
  return ok("Datos guardados");
}

// ---------------------------------------------------------------------------
// Características (campos c_<clave>; más una fila libre para agregar otra)
// ---------------------------------------------------------------------------
export async function guardarCaracteristicas(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const id = texto(form.get("id"));
  const caracteristicas: Record<string, string> = {};
  for (const [k, v] of form.entries()) {
    if (!k.startsWith("c_")) continue;
    const valor = texto(v);
    if (valor) caracteristicas[k.slice(2)] = valor;
  }
  const nuevaClave = slugDe(texto(form.get("nueva_clave"))).replace(/-/g, "_");
  const nuevoValor = texto(form.get("nuevo_valor"));
  if (nuevaClave && nuevoValor) caracteristicas[nuevaClave] = nuevoValor;

  const { supabase } = await equipo();
  const { error } = await supabase
    .from("productos")
    .update({ caracteristicas, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return falla(`No se pudo guardar: ${error.message}`);
  refrescar(id);
  return ok("Características guardadas");
}

// ---------------------------------------------------------------------------
// Preguntas frecuentes (pregunta_N / respuesta_N)
// ---------------------------------------------------------------------------
export async function guardarFaq(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const id = texto(form.get("id"));
  const faq: { pregunta: string; respuesta: string }[] = [];
  for (let i = 0; i < 30; i++) {
    const pregunta = texto(form.get(`pregunta_${i}`));
    const respuesta = texto(form.get(`respuesta_${i}`));
    if (pregunta && respuesta) faq.push({ pregunta, respuesta });
    else if (pregunta || respuesta) return falla(`A la pregunta ${i + 1} le falta la ${pregunta ? "respuesta" : "pregunta"}.`);
  }
  const { supabase } = await equipo();
  const { error } = await supabase.from("productos").update({ faq, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return falla(`No se pudo guardar: ${error.message}`);
  refrescar(id);
  return ok("Preguntas guardadas");
}

// ---------------------------------------------------------------------------
// Fotos
// ---------------------------------------------------------------------------
async function agregarImagen(productoId: string, url: string) {
  const { supabase } = await equipo();
  const { data: actuales } = await supabase.from("imagenes").select("orden, principal").eq("producto_id", productoId);
  const orden = Math.max(-1, ...(actuales ?? []).map((i) => i.orden)) + 1;
  const principal = !(actuales ?? []).some((i) => i.principal);
  const { data: p } = await supabase.from("productos").select("nombre").eq("id", productoId).single();
  return supabase.from("imagenes").insert({ producto_id: productoId, url, alt: p?.nombre ?? null, orden, principal });
}

/** Sube UNA foto (el navegador ya la achicó y la convirtió a WebP). */
export async function subirFoto(form: FormData): Promise<EstadoAccion> {
  const id = texto(form.get("id"));
  const archivo = form.get("archivo");
  if (!id || !(archivo instanceof File) || archivo.size === 0) return falla("No llegó ninguna foto.");
  if (!archivo.type.startsWith("image/")) return falla("El archivo no es una imagen.");
  if (archivo.size > 3_500_000) return falla("La foto pesa demasiado (máximo 3.5 MB).");

  const { supabase } = await equipo();
  const { data: p } = await supabase.from("productos").select("slug").eq("id", id).single();
  const extension = archivo.type === "image/webp" ? "webp" : archivo.type === "image/png" ? "png" : "jpg";
  const ruta = `${p?.slug ?? id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${extension}`;
  // Se envían los bytes tal cual (no como formulario) para que el archivo guardado sea la imagen
  const { error } = await supabase.storage.from(BUCKET).upload(ruta, await archivo.arrayBuffer(), {
    contentType: archivo.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) return falla(`No se pudo subir la foto: ${error.message}`);
  const url = supabase.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl;
  const { error: e2 } = await agregarImagen(id, url);
  if (e2) return falla(`La foto se subió pero no se pudo asociar: ${e2.message}`);
  refrescar(id);
  return ok("Foto agregada");
}

export async function agregarFotoUrl(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const id = texto(form.get("id"));
  const url = texto(form.get("url"));
  if (!/^https:\/\/\S+$/i.test(url) && !/^\/productos\/\S+$/.test(url)) {
    return falla("Pegá una dirección que empiece con https://");
  }
  const { error } = await agregarImagen(id, url);
  if (error) return falla(`No se pudo agregar: ${error.message}`);
  refrescar(id);
  return ok("Foto agregada");
}

/** Mover (subir/bajar), hacer principal, cambiar texto alternativo o quitar una foto. */
export async function cambiarFoto(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const id = texto(form.get("id"));
  const imagenId = texto(form.get("imagenId"));
  const accion = texto(form.get("accion"));
  const { supabase } = await equipo();
  const { data: fotos, error } = await supabase
    .from("imagenes")
    .select("id, url, orden, principal")
    .eq("producto_id", id)
    .order("orden");
  if (error || !fotos) return falla("No se pudieron leer las fotos.");
  const i = fotos.findIndex((f) => f.id === imagenId);
  if (i < 0) return falla("Esa foto ya no existe.");

  if (accion === "subir" || accion === "bajar") {
    const j = accion === "subir" ? i - 1 : i + 1;
    if (j < 0 || j >= fotos.length) return ok("Sin cambios");
    const orden = fotos.map((f) => f.id);
    [orden[i], orden[j]] = [orden[j], orden[i]];
    for (const [n, fid] of orden.entries()) {
      await supabase.from("imagenes").update({ orden: n }).eq("id", fid);
    }
  } else if (accion === "principal") {
    await supabase.from("imagenes").update({ principal: false }).eq("producto_id", id);
    await supabase.from("imagenes").update({ principal: true }).eq("id", imagenId);
  } else if (accion === "alt") {
    await supabase.from("imagenes").update({ alt: textoONulo(form.get("alt")) }).eq("id", imagenId);
  } else if (accion === "quitar") {
    const foto = fotos[i];
    const { error: e } = await supabase.from("imagenes").delete().eq("id", imagenId);
    if (e) return falla(`No se pudo quitar: ${e.message}`);
    // Si la foto estaba en nuestro almacenamiento, también se borra el archivo
    const marca = `/storage/v1/object/public/${BUCKET}/`;
    const pos = foto.url.indexOf(marca);
    if (pos >= 0) await supabase.storage.from(BUCKET).remove([decodeURIComponent(foto.url.slice(pos + marca.length))]);
    if (foto.principal) {
      const siguiente = fotos.find((f) => f.id !== imagenId);
      if (siguiente) await supabase.from("imagenes").update({ principal: true }).eq("id", siguiente.id);
    }
  } else {
    return falla("Acción desconocida.");
  }
  refrescar(id);
  return ok(accion === "quitar" ? "Foto quitada" : "Fotos actualizadas");
}

// ---------------------------------------------------------------------------
// Variantes: color, stock propio y si se muestra. El precio se cambia en Precios (guarda historial).
// ---------------------------------------------------------------------------
export async function guardarVariante(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const id = texto(form.get("id"));
  const varianteId = texto(form.get("varianteId"));
  const color = textoONulo(form.get("color"));
  const stock = Math.max(0, Math.round(Number(form.get("stock")) || 0));
  const activo = form.get("activo") === "on";
  const { supabase } = await equipo();
  const { data: v } = await supabase.from("variantes").select("ram_gb, almacenamiento_gb").eq("id", varianteId).single();
  const memoria =
    v?.almacenamiento_gb == null
      ? null
      : v.ram_gb == null
        ? formatoAlmacenamiento(v.almacenamiento_gb)
        : `${v.ram_gb} GB + ${formatoAlmacenamiento(v.almacenamiento_gb)}`;
  const nombre = [memoria, color].filter(Boolean).join(" · ") || "Único";
  const { error } = await supabase
    .from("variantes")
    .update({ color, stock, activo, nombre, updated_at: new Date().toISOString() })
    .eq("id", varianteId)
    .eq("producto_id", id);
  if (error) return falla(`No se pudo guardar: ${error.message}`);
  refrescar(id);
  return ok(`${nombre}: guardado`);
}

// ---------------------------------------------------------------------------
// Colecciones (Los más pedidos, Recién llegado, Quincena…)
// ---------------------------------------------------------------------------
export async function guardarColecciones(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const id = texto(form.get("id"));
  const elegidas = form.getAll("coleccion").map(String);
  const { supabase } = await equipo();
  const { error: e1 } = await supabase
    .from("coleccion_producto")
    .delete()
    .eq("producto_id", id)
    .not("coleccion_id", "in", `(${elegidas.length ? elegidas.join(",") : "00000000-0000-0000-0000-000000000000"})`);
  if (e1) return falla(`No se pudo guardar: ${e1.message}`);
  if (elegidas.length) {
    const { error } = await supabase
      .from("coleccion_producto")
      .upsert(elegidas.map((c) => ({ coleccion_id: c, producto_id: id })), { onConflict: "coleccion_id,producto_id", ignoreDuplicates: true });
    if (error) return falla(`No se pudo guardar: ${error.message}`);
  }
  refrescar(id);
  return ok("Colecciones guardadas");
}

// ---------------------------------------------------------------------------
// Publicación. Para mostrarlo en la tienda pide lo mínimo: una foto y un precio.
// ---------------------------------------------------------------------------
export async function cambiarEstado(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const id = texto(form.get("id"));
  const estado = texto(form.get("estado"));
  if (!["activo", "agotado", "oculto"].includes(estado)) return falla("Estado no válido.");
  const { supabase } = await equipo();
  const { data: p, error } = await supabase
    .from("productos")
    .select("publicado_en, categoria_id, imagenes(id), variantes(precio, activo)")
    .eq("id", id)
    .single();
  if (error || !p) return falla("No se encontró el producto.");

  if (estado !== "oculto") {
    const faltas: string[] = [];
    if (!p.imagenes?.length) faltas.push("al menos una foto");
    if (!p.variantes?.some((v) => v.activo && Number(v.precio) > 0)) faltas.push("precio de venta (en Precios)");
    if (!p.categoria_id) faltas.push("categoría");
    if (faltas.length) return falla(`Para publicarlo falta: ${faltas.join(", ")}.`);
  }

  const { error: e2 } = await supabase
    .from("productos")
    .update({
      estado,
      publicado_en: estado === "activo" && !p.publicado_en ? new Date().toISOString() : p.publicado_en,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (e2) return falla(`No se pudo guardar: ${e2.message}`);
  refrescar(id);
  return ok(estado === "oculto" ? "Oculto: ya no se ve en la tienda" : estado === "agotado" ? "Se muestra como agotado" : "Publicado en la tienda");
}

// ---------------------------------------------------------------------------
// Refrescar la tienda a mano (por ejemplo después de correr un SQL en Supabase)
// ---------------------------------------------------------------------------
export async function refrescarTienda(): Promise<EstadoAccion> {
  await equipo();
  refrescar();
  return ok("Listo: la tienda ya muestra los datos actuales");
}
