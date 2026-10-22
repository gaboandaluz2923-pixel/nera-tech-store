"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoAccion } from "@/components/admin/formulario-accion";
import { recalcularTotales, sugerirVarianteCompra, type Documento } from "@/lib/admin/compras";
import { equipo, superAdmin } from "@/lib/admin/sesion";
import { leerIdentificadores } from "@/lib/inventario/identificadores";
import { leerDteJson, leerPdf, leerTextoFactura, type FacturaLeida } from "@/lib/inventario/factura";
import { createServiceClient } from "@/lib/supabase/server";
import { ETIQUETA_CATALOGO } from "@/lib/tienda/datos";

// Inventario: compras al proveedor (crear, leer factura, recibir, pagar, anular), ajustes,
// identificadores (IMEI / serie) y garantía. Las compras y los costos son solo de administradores;
// la garantía y el IMEI en los pedidos también los usa el operador.

const texto = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const textoONulo = (v: FormDataEntryValue | null) => texto(v) || null;
const numero = (v: FormDataEntryValue | null) => {
  const n = Number(texto(v).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const ok = (mensaje: string): EstadoAccion => ({ ok: true, mensaje, vez: Date.now() });
const falla = (mensaje: string): EstadoAccion => ({ ok: false, mensaje, vez: Date.now() });
const esUuid = (s: string) => /^[0-9a-f-]{36}$/.test(s);
const DOCUMENTOS: Documento[] = ["ccf", "factura", "sin_iva"];
const BUCKET = "compras";
// El límite de envío del panel es 4 MB (Vercel no deja más): las facturas pesan mucho menos
const MAX_ARCHIVO = 3.5 * 1024 * 1024;

function refrescar(compraId?: string, conTienda = false) {
  revalidatePath("/admin/inventario");
  revalidatePath("/admin/inventario/compras");
  if (compraId) revalidatePath(`/admin/inventario/compras/${compraId}`);
  if (conTienda) updateTag(ETIQUETA_CATALOGO);
}

/** "Mensaje de error de la base" → texto para el panel (sin el prefijo técnico) */
const mensajeBase = (m: string) => m.replace(/^.*?ERROR:\s*/, "");

// ---------------------------------------------------------------------------
// Leer la factura (JSON del DTE o PDF)
// ---------------------------------------------------------------------------
async function leerArchivo(archivo: File): Promise<FacturaLeida | null> {
  const nombre = archivo.name.toLowerCase();
  if (nombre.endsWith(".json") || archivo.type === "application/json") {
    return leerDteJson(await archivo.text());
  }
  if (nombre.endsWith(".pdf") || archivo.type === "application/pdf") {
    try {
      return leerTextoFactura(await leerPdf(await archivo.arrayBuffer()));
    } catch (e) {
      console.error("leerPdf", e);
      return null;
    }
  }
  return null;
}

async function guardarArchivo(compraId: string, archivo: File) {
  const sb = createServiceClient();
  const limpio = archivo.name.replace(/[^\w.-]+/g, "_").slice(-80);
  const ruta = `${compraId}/${Date.now()}-${limpio}`;
  const { error } = await sb.storage
    .from(BUCKET)
    .upload(ruta, archivo, { contentType: archivo.type || "application/octet-stream", upsert: false });
  if (error) {
    console.error("subir factura", error);
    return null;
  }
  return ruta;
}

// ---------------------------------------------------------------------------
// Compras
// ---------------------------------------------------------------------------
export async function crearCompra(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const { supabase, usuario } = await superAdmin();
  const archivos = form.getAll("archivo").filter((a): a is File => a instanceof File && a.size > 0);
  if (archivos.reduce((s, a) => s + a.size, 0) > MAX_ARCHIVO) return falla("Los archivos pueden pesar hasta 3.5 MB entre todos.");

  // Si subió el JSON del DTE se usa ese (es exacto); si no, el PDF
  let leida: FacturaLeida | null = null;
  for (const a of [...archivos].sort((x, y) => Number(y.name.toLowerCase().endsWith(".json")) - Number(x.name.toLowerCase().endsWith(".json")))) {
    leida = await leerArchivo(a);
    if (leida && (leida.lineas.length || leida.origen === "dte_json")) break;
  }

  let proveedorId = textoONulo(form.get("proveedor_id"));
  if (!proveedorId && leida?.proveedorNit) {
    const { data } = await supabase.from("proveedores").select("id").eq("nit", leida.proveedorNit).maybeSingle();
    proveedorId = (data?.id as string | undefined) ?? null;
  }
  let diasProveedor = 0;
  if (proveedorId) {
    const { data } = await supabase.from("proveedores").select("plazo_credito_dias").eq("id", proveedorId).maybeSingle();
    diasProveedor = Number(data?.plazo_credito_dias ?? 0);
  }

  const condicionForm = texto(form.get("condicion"));
  const condicion = (condicionForm || leida?.condicion || (diasProveedor > 0 ? "credito" : "contado")) === "credito" ? "credito" : "contado";
  const diasForm = texto(form.get("dias_credito"));
  const dias = condicion === "credito" ? Math.round(diasForm ? numero(form.get("dias_credito")) : (leida?.dias ?? diasProveedor)) : 0;
  const docForm = texto(form.get("documento")) as Documento;
  const documento: Documento = DOCUMENTOS.includes(docForm) ? docForm : (leida?.documento ?? "ccf");
  const fecha = texto(form.get("fecha")) || leida?.fecha || new Date().toLocaleDateString("en-CA", { timeZone: "America/El_Salvador" });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return falla("La fecha no es válida.");
  if (dias < 0 || dias > 180) return falla("Los días de crédito van de 0 a 180.");

  if (leida?.codigoGeneracion) {
    const { data: repetida } = await supabase
      .from("compras")
      .select("id, numero")
      .eq("codigo_generacion", leida.codigoGeneracion)
      .neq("estado", "anulada")
      .maybeSingle();
    if (repetida) return falla(`Esta factura ya está registrada (${repetida.numero ?? "sin número"}).`);
  }

  const { data: compra, error } = await supabase
    .from("compras")
    .insert({
      proveedor_id: proveedorId,
      numero: textoONulo(form.get("numero")) ?? leida?.numero ?? null,
      codigo_generacion: leida?.codigoGeneracion ?? null,
      fecha,
      condicion,
      dias_credito: dias,
      documento,
      otros_costos: Math.max(0, numero(form.get("otros_costos"))),
      notas: textoONulo(form.get("notas")),
      creado_por: usuario,
    })
    .select("id")
    .single();
  if (error || !compra) return falla(`No se pudo crear la compra: ${error?.message ?? "sin respuesta"}`);
  const id = compra.id as string;

  // Archivos de la factura (privados)
  const rutas: string[] = [];
  for (const a of archivos) {
    const ruta = await guardarArchivo(id, a);
    if (ruta) rutas.push(ruta);
  }
  if (rutas.length) await supabase.from("compras").update({ archivo: rutas.join("\n") }).eq("id", id);

  // Líneas leídas, cada una con su producto sugerido
  if (leida?.lineas.length) {
    const filas = [];
    for (const l of leida.lineas) {
      filas.push({
        compra_id: id,
        variante_id: await sugerirVarianteCompra(supabase, proveedorId, l.descripcion, l.codigo),
        descripcion: l.descripcion.slice(0, 300),
        sku_proveedor: l.codigo,
        cantidad: l.cantidad,
        costo_unitario: l.costo,
      });
    }
    const { error: e2 } = await supabase.from("compra_lineas").insert(filas);
    if (e2) console.error("lineas compra", e2);
    await recalcularTotales(supabase, id);
  }
  const avisos = [
    ...(leida?.avisos ?? []),
    archivos.length && !leida ? "No se pudo leer el archivo; agregá las líneas a mano." : "",
    leida?.proveedorNit && !proveedorId ? `No hay proveedor con NIT ${leida.proveedorNit}: elegilo y guardá su NIT en Proveedores.` : "",
  ].filter(Boolean);
  refrescar(id);
  const aviso = avisos.length ? `&aviso=${encodeURIComponent(avisos.join(" "))}` : "";
  redirect(`/admin/inventario/compras/${id}?nueva=1${aviso}` as `/admin/inventario/compras/${string}`);
}

export async function guardarCompra(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const id = texto(form.get("id"));
  const { supabase } = await superAdmin();
  const { data: c } = await supabase.from("compras").select("estado").eq("id", id).single();
  if (!c) return falla("No se encontró la compra.");
  const condicion = texto(form.get("condicion")) === "credito" ? "credito" : "contado";
  const dias = condicion === "credito" ? Math.round(numero(form.get("dias_credito"))) : 0;
  if (dias < 0 || dias > 180) return falla("Los días de crédito van de 0 a 180.");
  const fecha = texto(form.get("fecha"));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return falla("La fecha no es válida.");
  const cambios: Record<string, unknown> = {
    proveedor_id: textoONulo(form.get("proveedor_id")),
    numero: textoONulo(form.get("numero")),
    fecha,
    condicion,
    dias_credito: dias,
    notas: textoONulo(form.get("notas")),
  };
  // El documento y los otros costos cambian el costo de las unidades: solo antes de recibir
  if (c.estado === "borrador") {
    const doc = texto(form.get("documento")) as Documento;
    if (DOCUMENTOS.includes(doc)) cambios.documento = doc;
    cambios.otros_costos = Math.max(0, numero(form.get("otros_costos")));
  }
  const { error } = await supabase.from("compras").update(cambios).eq("id", id);
  if (error) return falla(`No se pudo guardar: ${error.message}`);
  await recalcularTotales(supabase, id);
  refrescar(id);
  return ok("Compra guardada");
}

export async function subirArchivoCompra(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const id = texto(form.get("id"));
  const archivo = form.get("archivo");
  if (!(archivo instanceof File) || !archivo.size) return falla("Elegí el archivo de la factura.");
  if (archivo.size > MAX_ARCHIVO) return falla("El archivo puede pesar hasta 3.5 MB.");
  const { supabase } = await superAdmin();
  const { data: c } = await supabase.from("compras").select("archivo").eq("id", id).single();
  if (!c) return falla("No se encontró la compra.");
  const ruta = await guardarArchivo(id, archivo);
  if (!ruta) return falla("No se pudo subir el archivo.");
  await supabase
    .from("compras")
    .update({ archivo: [c.archivo, ruta].filter(Boolean).join("\n") })
    .eq("id", id);
  refrescar(id);
  return ok("Archivo guardado");
}

/** Enlace temporal (10 minutos) para ver un archivo privado de la compra */
export async function verArchivoCompra(compraId: string, ruta: string): Promise<string | null> {
  const { supabase } = await superAdmin();
  const { data: c } = await supabase.from("compras").select("archivo").eq("id", compraId).single();
  if (!c?.archivo || !String(c.archivo).split("\n").includes(ruta)) return null;
  const { data } = await createServiceClient().storage.from(BUCKET).createSignedUrl(ruta, 600);
  return data?.signedUrl ?? null;
}

async function compraBorrador(compraId: string) {
  const s = await superAdmin();
  const { data: c } = await s.supabase.from("compras").select("id, estado, proveedor_id, documento").eq("id", compraId).single();
  return { ...s, compra: c as { id: string; estado: string; proveedor_id: string | null; documento: Documento } | null };
}

function datosLinea(form: FormData) {
  const condicion = texto(form.get("condicion"));
  return {
    variante_id: textoONulo(form.get("variante_id")),
    descripcion: texto(form.get("descripcion")).slice(0, 300),
    sku_proveedor: textoONulo(form.get("sku_proveedor")),
    cantidad: Math.round(numero(form.get("cantidad"))),
    costo_unitario: Math.round(numero(form.get("costo_unitario")) * 10000) / 10000,
    condicion: ["nuevo", "open_box", "usado"].includes(condicion) ? condicion : "nuevo",
    identificadores: leerIdentificadores(texto(form.get("identificadores"))),
  };
}

export async function guardarLineaCompra(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const compraId = texto(form.get("compra_id"));
  const lineaId = texto(form.get("linea_id"));
  const { supabase, compra } = await compraBorrador(compraId);
  if (!compra) return falla("No se encontró la compra.");
  const d = datosLinea(form);
  if (compra.estado !== "borrador") {
    // Ya recibida: solo se pueden completar los identificadores desde Inventario → variante
    return falla("La compra ya fue recibida. Los IMEI que falten se registran en Inventario → la variante.");
  }
  if (!d.descripcion && !d.variante_id) return falla("Escribí qué producto es.");
  if (d.cantidad <= 0) return falla("La cantidad debe ser mayor que cero.");
  if (d.costo_unitario < 0) return falla("El costo no puede ser negativo.");
  // El costo se guarda como lo pide el documento: sin IVA en crédito fiscal (el IVA se recupera) y con IVA en factura
  // de consumidor final. Si el proveedor lo dio al revés, se convierte aquí.
  const escrito = d.costo_unitario;
  const conIva = texto(form.get("costo_iva")) === "con";
  let conversion = "";
  if (compra.documento === "ccf" && conIva) {
    d.costo_unitario = Math.round((escrito / 1.13) * 10000) / 10000;
    conversion = ` ($${escrito.toFixed(2)} con IVA → $${d.costo_unitario.toFixed(2)} sin IVA, porque es crédito fiscal)`;
  } else if (compra.documento === "factura" && texto(form.get("costo_iva")) === "sin") {
    d.costo_unitario = Math.round(escrito * 1.13 * 10000) / 10000;
    conversion = ` ($${escrito.toFixed(2)} + IVA → $${d.costo_unitario.toFixed(2)} con IVA, porque es factura de consumidor final)`;
  }
  if (d.identificadores.length > d.cantidad)
    return falla(`Pegaste ${d.identificadores.length} identificadores para ${d.cantidad} unidades.`);
  if (!d.descripcion && d.variante_id) {
    const { data: v } = await supabase.from("variantes").select("nombre, productos(nombre)").eq("id", d.variante_id).single();
    const p = v?.productos as unknown as { nombre: string } | null;
    d.descripcion = [p?.nombre, v?.nombre].filter(Boolean).join(" ");
  }
  const { error } = lineaId
    ? await supabase.from("compra_lineas").update(d).eq("id", lineaId).eq("compra_id", compraId)
    : await supabase.from("compra_lineas").insert({ ...d, compra_id: compraId });
  if (error) return falla(`No se pudo guardar: ${error.message}`);
  await recalcularTotales(supabase, compraId);
  refrescar(compraId);
  return ok((lineaId ? "Línea guardada" : "Línea agregada") + conversion);
}

export async function quitarLineaCompra(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const compraId = texto(form.get("compra_id"));
  const lineaId = texto(form.get("linea_id"));
  const { supabase, compra } = await compraBorrador(compraId);
  if (!compra || compra.estado !== "borrador") return falla("Solo se quitan líneas antes de recibir la compra.");
  const { error } = await supabase.from("compra_lineas").delete().eq("id", lineaId).eq("compra_id", compraId);
  if (error) return falla(`No se pudo quitar: ${error.message}`);
  await recalcularTotales(supabase, compraId);
  refrescar(compraId);
  return ok("Línea quitada");
}

export async function recibirCompra(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const id = texto(form.get("id"));
  const { supabase } = await superAdmin();
  const { error } = await supabase.rpc("inv_recibir_compra", { p_compra: id });
  if (error) return falla(mensajeBase(error.message));
  refrescar(id, true);
  return ok("Compra recibida: las unidades ya están en bodega");
}

export async function pagarCompra(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const id = texto(form.get("id"));
  const quitar = texto(form.get("quitar")) === "1";
  const fecha = texto(form.get("pagada_en")) || new Date().toLocaleDateString("en-CA", { timeZone: "America/El_Salvador" });
  if (!quitar && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return falla("La fecha de pago no es válida.");
  const { supabase } = await superAdmin();
  const { error } = await supabase
    .from("compras")
    .update({ pagada_en: quitar ? null : fecha })
    .eq("id", id)
    .neq("estado", "anulada");
  if (error) return falla(`No se pudo guardar: ${error.message}`);
  refrescar(id);
  return ok(quitar ? "Pago quitado" : "Factura marcada como pagada");
}

export async function anularCompra(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const id = texto(form.get("id"));
  if (form.get("confirmar") !== "on") return falla("Marcá la casilla para confirmar que querés anularla.");
  const { supabase } = await superAdmin();
  const { error } = await supabase.rpc("inv_anular_compra", { p_compra: id });
  if (error) return falla(mensajeBase(error.message));
  refrescar(id, true);
  return ok("Compra anulada");
}

// ---------------------------------------------------------------------------
// Variante: ajuste con costo, identificadores, mover a Open Box, baja
// ---------------------------------------------------------------------------
function refrescarVariante(varianteId: string) {
  revalidatePath("/admin/inventario");
  revalidatePath(`/admin/inventario/variante/${varianteId}`);
  updateTag(ETIQUETA_CATALOGO);
}

export async function ajustarStock(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const varianteId = texto(form.get("variante_id"));
  const total = Math.round(numero(form.get("total")));
  const costo = texto(form.get("costo")) ? numero(form.get("costo")) : null;
  const nota = textoONulo(form.get("nota"));
  if (!nota) return falla("Escribí el motivo del ajuste (conteo, dañado, regalo…).");
  const { supabase } = await superAdmin();
  const { error } = await supabase.rpc("inv_ajustar", { p_variante: varianteId, p_total: total, p_nota: nota, p_costo: costo });
  if (error) return falla(mensajeBase(error.message));
  refrescarVariante(varianteId);
  return ok(`Stock en bodega: ${total}`);
}

/** Corregir o completar el costo de un lote (por ejemplo, el stock que ya estaba sin costo) */
export async function guardarCostoLote(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const loteId = texto(form.get("lote_id"));
  const varianteId = texto(form.get("variante_id"));
  const costo = numero(form.get("costo"));
  if (!(costo > 0)) return falla("Escribí el costo de cada unidad.");
  const { supabase } = await superAdmin();
  const { error } = await supabase
    .from("lotes")
    .update({ costo_unitario: Math.round(costo * 10000) / 10000 })
    .eq("id", loteId)
    .eq("variante_id", varianteId);
  if (error) return falla(`No se pudo guardar: ${error.message}`);
  refrescarVariante(varianteId);
  return ok("Costo guardado");
}

export async function registrarImeiCompra(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const compraId = texto(form.get("compra_id"));
  const lineaId = texto(form.get("linea_id"));
  const items = leerIdentificadores(texto(form.get("identificadores")));
  if (!items.length) return falla("Pegá o escaneá los IMEI (uno por línea).");
  const { supabase } = await superAdmin();
  const { data, error } = await supabase.rpc("inv_registrar_unidades_compra", { p_linea: lineaId, p_items: items });
  if (error) return falla(mensajeBase(error.message));
  const { data: l } = await supabase.from("compra_lineas").select("variante_id").eq("id", lineaId).maybeSingle();
  if (l?.variante_id) refrescarVariante(l.variante_id as string);
  refrescar(compraId);
  return ok(`${data} ${data === 1 ? "IMEI registrado" : "IMEI registrados"}`);
}

export async function registrarIdentificadores(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const varianteId = texto(form.get("variante_id"));
  const items = leerIdentificadores(texto(form.get("identificadores")));
  const cantidadCodigos = Math.round(numero(form.get("codigos_nera")));
  // Para accesorios sin número de serie: el sistema crea códigos Nera (NT-000123) para etiquetar
  const todos = [...items, ...Array.from({ length: Math.max(0, cantidadCodigos) }, () => ({ identificador: "" }))];
  if (!todos.length) return falla("Pegá los IMEI o números de serie (uno por línea), o pedí códigos Nera.");
  const { supabase } = await equipo();
  const { data, error } = await supabase.rpc("inv_registrar_unidades", { p_variante: varianteId, p_items: todos });
  if (error) return falla(mensajeBase(error.message));
  refrescarVariante(varianteId);
  return ok(`${data} ${data === 1 ? "unidad registrada" : "unidades registradas"}`);
}

export async function moverUnidad(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const unidadId = texto(form.get("unidad_id"));
  const destino = texto(form.get("variante_destino"));
  const origen = texto(form.get("variante_id"));
  const condicion = texto(form.get("condicion"));
  if (!esUuid(destino)) return falla("Elegí a qué producto pasa.");
  const { supabase } = await superAdmin();
  const { error } = await supabase.rpc("inv_mover_unidad", {
    p_unidad: unidadId,
    p_variante_destino: destino,
    p_condicion: condicion,
    p_nota: textoONulo(form.get("nota")),
  });
  if (error) return falla(mensajeBase(error.message));
  refrescarVariante(origen);
  refrescarVariante(destino);
  return ok("Unidad movida");
}

export async function cambiarEstadoUnidad(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const unidadId = texto(form.get("unidad_id"));
  const estado = texto(form.get("estado"));
  const nota = textoONulo(form.get("nota"));
  if (!nota) return falla("Escribí qué pasó (por ejemplo, la falla que reporta el cliente).");
  const { supabase } = await equipo();
  const { data: u } = await supabase.from("unidades").select("variante_id").eq("id", unidadId).maybeSingle();
  const { error } = await supabase.rpc("inv_estado_unidad", { p_unidad: unidadId, p_estado: estado, p_nota: nota });
  if (error) return falla(mensajeBase(error.message));
  revalidatePath("/admin/garantia");
  if (u?.variante_id) refrescarVariante(u.variante_id as string);
  return ok(estado === "garantia" ? "Registrado: entra a garantía" : estado === "vendida" ? "Registrado: sale de garantía" : "Unidad dada de baja");
}

// ---------------------------------------------------------------------------
// Pedidos: el equipo que sale (IMEI / serie)
// ---------------------------------------------------------------------------
export async function asignarUnidad(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const lineaId = texto(form.get("linea_id"));
  const pedidoId = texto(form.get("pedido_id"));
  const identificador = texto(form.get("identificador"));
  const quitar = textoONulo(form.get("quitar"));
  if (!identificador) return falla("Escribí o escaneá el IMEI o número de serie.");
  const { supabase } = await equipo();
  const { data, error } = await supabase.rpc("inv_asignar_unidad", {
    p_linea: lineaId,
    p_identificador: identificador,
    p_quitar: quitar,
  });
  if (error) return falla(mensajeBase(error.message));
  revalidatePath(`/admin/pedidos/${pedidoId}`);
  updateTag(ETIQUETA_CATALOGO);
  return ok((data as { mensaje?: string } | null)?.mensaje ?? "Equipo asignado");
}
