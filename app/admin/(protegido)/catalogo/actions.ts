"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoAccion } from "@/components/admin/formulario-accion";
import { equipo } from "@/lib/admin/sesion";
import { datosVariante, interpretarNombre, productoConClave, slugLibre, type VarianteNueva } from "@/lib/admin/catalogo";
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
  const disp = texto(form.get("disponibilidad_manual"));
  const disponibilidad_manual = ["auto", "bajo_pedido", "agotado"].includes(disp) ? disp : "auto";
  const nota = textoONulo(form.get("nota"));
  const { supabase } = await equipo();
  const { data: v } = await supabase
    .from("variantes")
    .select("ram_gb, almacenamiento_gb, stock")
    .eq("id", varianteId)
    .eq("producto_id", id)
    .single();
  if (!v) return falla("No se encontró la variante.");
  const memoria =
    v?.almacenamiento_gb == null
      ? null
      : v.ram_gb == null
        ? formatoAlmacenamiento(v.almacenamiento_gb)
        : `${v.ram_gb} GB + ${formatoAlmacenamiento(v.almacenamiento_gb)}`;
  const nombre = [memoria, color].filter(Boolean).join(" · ") || "Único";
  const { error } = await supabase
    .from("variantes")
    .update({ color, activo, nombre, disponibilidad_manual, updated_at: new Date().toISOString() })
    .eq("id", varianteId)
    .eq("producto_id", id);
  if (error) return falla(`No se pudo guardar: ${error.message}`);
  // El stock en bodega cambia con un ajuste de inventario (queda en el kardex con quién y por qué)
  if (stock !== v.stock) {
    const { error: e2 } = await supabase.rpc("inv_ajustar", {
      p_variante: varianteId,
      p_total: stock,
      p_nota: nota ?? "Conteo de bodega",
    });
    if (e2) return falla(`Se guardó lo demás, pero no el stock: ${e2.message}`);
  }
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

// ---------------------------------------------------------------------------
// Open Box: ficha aparte (categoría Open Box), enlazada al modelo nuevo.
// No copia las fotos (se usan las del modelo nuevo hasta que subás las reales de la unidad)
// ni las claves de proveedor (las listas de precios siguen yendo al producto nuevo).
// ---------------------------------------------------------------------------
export async function crearOpenBox(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const baseId = texto(form.get("id"));
  const varianteBaseId = texto(form.get("varianteId"));
  const condicion = texto(form.get("condicion")) === "usado" ? "usado" : "open_box";
  const detalle = textoONulo(form.get("condicion_detalle"));
  const { supabase } = await equipo();
  const [{ data: base }, { data: cat }] = await Promise.all([
    supabase
      .from("productos")
      .select("id, slug, nombre, marca, modelo, resumen, descripcion, caracteristicas, incluye, condicion")
      .eq("id", baseId)
      .single(),
    supabase.from("categorias").select("id").eq("slug", "open-box").maybeSingle(),
  ]);
  if (!base) return falla("No se encontró el producto.");
  if (base.condicion !== "nuevo") return falla("Este producto ya es Open Box o usado.");
  const { data: vb } = await supabase
    .from("variantes")
    .select("nombre, color, ram_gb, almacenamiento_gb, memoria")
    .eq("id", varianteBaseId)
    .eq("producto_id", baseId)
    .maybeSingle();
  if (!vb) return falla("Elegí la variante (memoria y color) de la unidad.");

  const sufijo = condicion === "usado" ? "Usado" : "Open Box";
  const nombre = `${base.nombre} ${sufijo}`;
  let slug = slugDe(`${base.slug}-${sufijo}`);
  // Si ya existe (otro Open Box del mismo modelo), se agrega la variante a esa ficha
  const { data: existente } = await supabase
    .from("productos")
    .select("id")
    .eq("producto_base_id", baseId)
    .eq("condicion", condicion)
    .maybeSingle();
  let id = existente?.id as string | undefined;
  if (!id) {
    for (let n = 2; ; n++) {
      const { data: usado } = await supabase.from("productos").select("id").eq("slug", slug).maybeSingle();
      if (!usado) break;
      slug = slugDe(`${base.slug}-${sufijo}-${n}`);
    }
    const { data: nuevo, error } = await supabase
      .from("productos")
      .insert({
        slug,
        nombre,
        marca: base.marca,
        modelo: base.modelo,
        categoria_id: cat?.id ?? null,
        resumen: base.resumen,
        descripcion: base.descripcion,
        caracteristicas: base.caracteristicas ?? {},
        incluye: base.incluye,
        condicion,
        producto_base_id: baseId,
        condicion_detalle: detalle,
        estado: "oculto",
      })
      .select("id")
      .single();
    if (error || !nuevo) return falla(`No se pudo crear: ${error?.message ?? "sin respuesta"}`);
    id = nuevo.id as string;
  }
  const { data: yaVariante } = await supabase
    .from("variantes")
    .select("id")
    .eq("producto_id", id)
    .eq("ram_gb", vb.ram_gb ?? -1)
    .eq("almacenamiento_gb", vb.almacenamiento_gb ?? -1)
    .eq("color", vb.color ?? "")
    .maybeSingle();
  if (!yaVariante) {
    const { error } = await supabase.from("variantes").insert({
      producto_id: id,
      nombre: vb.nombre,
      memoria: vb.memoria,
      color: vb.color,
      ram_gb: vb.ram_gb,
      almacenamiento_gb: vb.almacenamiento_gb,
      precio: 0,
      stock: 0,
      activo: true,
    });
    if (error) return falla(`Se creó la ficha, pero no la variante: ${error.message}`);
  }
  refrescar(id);
  return ok(
    existente
      ? `Listo: ${vb.nombre} agregado a ${nombre}. Ponele precio y recibí la unidad en Inventario.`
      : `Listo: se creó "${nombre}" (oculto). Ponele precio, recibí la unidad en Inventario y publicalo.`
  );
}

/** Condición de un producto Open Box / usado: en qué estado viene y de qué modelo nuevo sale */
export async function guardarCondicion(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const id = texto(form.get("id"));
  const condicion = texto(form.get("condicion"));
  if (!["open_box", "usado"].includes(condicion)) return falla("Elegí Open Box o usado.");
  const baseId = textoONulo(form.get("producto_base_id"));
  const { supabase } = await equipo();
  const { error } = await supabase
    .from("productos")
    .update({
      condicion,
      condicion_detalle: textoONulo(form.get("condicion_detalle")),
      producto_base_id: baseId && baseId !== id ? baseId : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .neq("condicion", "nuevo");
  if (error) return falla(`No se pudo guardar: ${error.message}`);
  refrescar(id);
  return ok("Condición guardada");
}

// ---------------------------------------------------------------------------
// Productos y variantes nuevos, escritos a mano (lo que no viene en una lista de proveedor)
// ---------------------------------------------------------------------------
const MAX_VARIANTES = 20;

/** "6" → 6; "" → null; "1TB" → 1024. Devuelve undefined si no es un número válido. */
function gb(v: FormDataEntryValue | null): number | null | undefined {
  const t = String(v ?? "").trim().toLowerCase().replace(/\s|gb/g, "");
  if (!t) return null;
  const tb = t.endsWith("tb");
  const n = Number(tb ? t.slice(0, -2) : t);
  if (!Number.isFinite(n) || n <= 0 || n > 4096) return undefined;
  return Math.round(tb ? n * 1024 : n);
}

/** Lee las filas de variantes del formulario (campos ram, alm y color repetidos). */
function leerVariantes(form: FormData): VarianteNueva[] | string {
  const rams = form.getAll("ram");
  const alms = form.getAll("alm");
  const colores = form.getAll("color");
  const filas: VarianteNueva[] = [];
  for (let i = 0; i < Math.max(rams.length, alms.length, colores.length); i++) {
    const ramGb = gb(rams[i] ?? null);
    const almacenamientoGb = gb(alms[i] ?? null);
    const color = texto(colores[i] ?? null).slice(0, 40) || null;
    if (ramGb === undefined || almacenamientoGb === undefined) return `Fila ${i + 1}: la RAM y el almacenamiento van en GB (ej. 8 y 256).`;
    if (ramGb !== null && almacenamientoGb === null) return `Fila ${i + 1}: si ponés RAM, poné también el almacenamiento.`;
    if (ramGb === null && almacenamientoGb === null && !color) continue;
    filas.push({ ramGb, almacenamientoGb, color });
  }
  return filas.length ? filas : [{ ramGb: null, almacenamientoGb: null, color: null }];
}

export async function crearProducto(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const nombre = texto(form.get("nombre")).replace(/\s+/g, " ").slice(0, 120);
  if (nombre.length < 3) return falla("Escribí el nombre del producto (ej. Xiaomi Redmi Note 17 Pro 5G).");
  const variantes = leerVariantes(form);
  if (typeof variantes === "string") return falla(variantes);
  if (variantes.length > MAX_VARIANTES) return falla(`Máximo ${MAX_VARIANTES} variantes a la vez.`);
  const categoriaId = textoONulo(form.get("categoria_id"));
  if (!categoriaId) return falla("Elegí la categoría.");
  const proveedorId = textoONulo(form.get("proveedor_id"));
  const costo = Number(String(form.get("costo") ?? "").replace(/[$,\s]/g, "")) || 0;
  const sku = texto(form.get("sku")).slice(0, 60);
  if (proveedorId && !(costo > 0)) return falla("Si elegís proveedor, escribí cuánto te cuesta (precio de lista).");

  const { supabase, esSuperAdmin } = await equipo();
  const i = interpretarNombre(nombre);
  const existe = await productoConClave(supabase, i.clave);
  if (existe) return falla(`Ya existe "${existe.nombre}". Abrilo en Catálogo y agregale la variante con "+ Agregar variante".`);

  const slug = await slugLibre(supabase, nombre);
  const { data: prod, error } = await supabase
    .from("productos")
    .insert({
      clave: i.clave,
      slug,
      nombre,
      marca: texto(form.get("marca")).slice(0, 40) || i.marca,
      modelo: i.modelo,
      categoria_id: categoriaId,
      estado: "oculto",
    })
    .select("id")
    .single();
  if (error || !prod) return falla(`No se pudo crear: ${error?.message ?? "sin respuesta"}`);

  // Variantes (sin repetir la misma memoria y color)
  const filas = [...new Map(variantes.map((v) => datosVariante(i.clave, v)).map((d) => [d.clave, d])).values()];
  const { data: vars, error: e2 } = await supabase
    .from("variantes")
    .insert(filas.map((d) => ({ ...d, producto_id: prod.id, precio: 0, stock: 0, activo: true })))
    .select("id, clave");
  if (e2) return falla(`Se creó el producto, pero no sus variantes: ${e2.message}`);

  // Proveedor y costo (solo administradores: el costo no lo ve el operador)
  let avisoCosto = "";
  if (proveedorId && costo > 0) {
    if (!esSuperAdmin) avisoCosto = " El costo no se guardó: eso lo pone un administrador en Precios.";
    else {
      const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/El_Salvador" });
      const { error: e3 } = await supabase.from("producto_proveedor").insert(
        (vars ?? []).map((v) => ({
          variante_id: v.id,
          proveedor_id: proveedorId,
          sku_proveedor: sku && (vars ?? []).length === 1 ? `sku:${sku}` : `manual:${v.clave}`,
          ultimo_precio: Math.round(costo * 100) / 100,
          ultima_fecha: hoy,
          activo: true,
        }))
      );
      if (e3) avisoCosto = ` El costo no se guardó (${e3.message}).`;
    }
  }
  refrescar(prod.id);
  revalidatePath("/admin/precios");
  redirect(
    `/admin/catalogo/${prod.id}?nuevo=${encodeURIComponent(`Se creó "${nombre}" (oculto).${avisoCosto} Subí fotos, completá los textos y ponele precio.`)}`
  );
}

/** "+ Agregar variante" en la ficha: otra memoria o color del mismo producto. */
export async function agregarVariante(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const id = texto(form.get("id"));
  const variantes = leerVariantes(form);
  if (typeof variantes === "string") return falla(variantes);
  const v = variantes[0];
  if (v.ramGb === null && v.almacenamientoGb === null && !v.color) return falla("Escribí la memoria, el color o los dos.");

  const { supabase } = await equipo();
  const { data: p } = await supabase
    .from("productos")
    .select("clave, nombre, variantes(id, ram_gb, almacenamiento_gb, color, precio)")
    .eq("id", id)
    .single();
  if (!p) return falla("No se encontró el producto.");
  const existentes = (p.variantes ?? []) as { ram_gb: number | null; almacenamiento_gb: number | null; color: string | null; precio: number }[];
  const igual = (x: string | null, y: string | null) => (x ?? "").trim().toLowerCase() === (y ?? "").trim().toLowerCase();
  if (existentes.some((x) => x.ram_gb === v.ramGb && x.almacenamiento_gb === v.almacenamientoGb && igual(x.color, v.color)))
    return falla("Esa variante ya existe.");
  // Mismo precio que los otros colores de esa memoria (si ya tiene); si no, sin precio hasta que lo pongas en Precios
  const precio = Math.max(
    0,
    ...existentes.filter((x) => x.ram_gb === v.ramGb && x.almacenamiento_gb === v.almacenamientoGb).map((x) => Number(x.precio) || 0)
  );
  const d = datosVariante(p.clave as string | null, v);
  const { error } = await supabase.from("variantes").insert({ ...d, producto_id: id, precio, stock: 0, activo: true });
  if (error) return falla(`No se pudo agregar: ${error.message}`);
  refrescar(id);
  revalidatePath("/admin/precios");
  return ok(precio ? `${d.nombre} agregado a ${p.nombre}, a $${precio.toFixed(2)} como los otros colores.` : `${d.nombre} agregado a ${p.nombre}. Ponele precio en Precios.`);
}
