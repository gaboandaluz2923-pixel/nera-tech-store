"use server";

import { fijarPrecio } from "../precios/actions";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoAccion } from "@/components/admin/formulario-accion";
import { superAdmin } from "@/lib/admin/sesion";
import { normalizarCodigo } from "@/lib/tienda/beneficios";
import { minimoSinPerdida } from "@/lib/pricing";
import { costosDeVariantes } from "@/lib/tienda/costos";
import { ETIQUETA_CATALOGO, configTienda } from "@/lib/tienda/datos";

// Promociones del panel: ofertas con fecha, combos y cupones.
// Nada se borra: las ofertas, combos y cupones se apagan (así el historial de pedidos queda intacto).

const texto = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const numero = (v: FormDataEntryValue | null) => {
  const t = texto(v).replace(/[$,\s%]/g, "");
  return t === "" ? null : Number(t);
};
/** "2026-10-18T23:59" (hora de El Salvador, UTC−6 todo el año) → ISO */
const fechaSV = (v: FormDataEntryValue | null, finDelDia = false) => {
  const t = texto(v);
  if (!t) return null;
  const d = new Date(`${t.length === 10 ? `${t}T${finDelDia ? "23:59" : "00:00"}` : t}:00-06:00`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
};
const ok = (mensaje: string): EstadoAccion => ({ ok: true, mensaje, vez: Date.now() });
const falla = (mensaje: string): EstadoAccion => ({ ok: false, mensaje, vez: Date.now() });

function refrescar(tienda = true) {
  revalidatePath("/admin/promociones", "layout");
  if (tienda) updateTag(ETIQUETA_CATALOGO);
}

// ---------------------------------------------------------------------------
// Ofertas con fecha
// ---------------------------------------------------------------------------
function leerOferta(form: FormData) {
  const nombre = texto(form.get("nombre")).slice(0, 80);
  const inicio = fechaSV(form.get("inicio"));
  const fin = fechaSV(form.get("fin"), true);
  if (nombre.length < 3) return { error: "Poné un nombre a la oferta (ej. Quincena de octubre)." };
  if (inicio === undefined || fin === undefined) return { error: "Revisá las fechas." };
  if (!fin) return { error: "Elegí cuándo termina la oferta: así el precio vuelve solo a la normalidad." };
  if (inicio && new Date(inicio) >= new Date(fin)) return { error: "La oferta tiene que terminar después de empezar." };
  return { nombre, inicio, fin };
}

export async function crearOferta(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const d = leerOferta(form);
  if ("error" in d) return falla(d.error!);
  const { supabase } = await superAdmin();
  const { data, error } = await supabase
    .from("promociones")
    .insert({ tipo: "descuento_fecha", nombre: d.nombre, inicio: d.inicio, fin: d.fin, activa: false })
    .select("id")
    .single();
  if (error) return falla(`No se pudo crear: ${error.message}`);
  refrescar(false);
  redirect(`/admin/promociones/oferta/${data.id}`);
}

export async function guardarOferta(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const id = texto(form.get("id"));
  const d = leerOferta(form);
  if ("error" in d) return falla(d.error!);
  const { supabase } = await superAdmin();

  // Precios: un campo por variante; vacío = no entra en la oferta
  const precios: { promocion_id: string; variante_id: string; precio: number }[] = [];
  for (const [k, v] of form.entries()) {
    if (!k.startsWith("precio_")) continue;
    const p = numero(v);
    if (p === null) continue;
    if (!(p > 0)) return falla("Revisá los precios de oferta: deben ser mayores que cero.");
    precios.push({ promocion_id: id, variante_id: k.slice(7), precio: Math.round(p * 100) / 100 });
  }
  const { data: normales } = await supabase
    .from("variantes")
    .select("id, precio")
    .in("id", precios.map((p) => p.variante_id));
  const normal = new Map((normales ?? []).map((v) => [v.id as string, Number(v.precio)]));
  const caro = precios.find((p) => p.precio >= (normal.get(p.variante_id) ?? 0));
  if (caro) return falla("Un precio de oferta es igual o mayor que el precio normal. Bajalo o dejalo vacío.");

  // Ninguna oferta por debajo del mínimo sin pérdida (con el costo de lo que hay en bodega) sin confirmarlo
  if (form.get("acepta_perdida") !== "on" && precios.length) {
    const [costos, config] = await Promise.all([costosDeVariantes(precios.map((p) => p.variante_id)), configTienda()]);
    const bajos = precios.filter((p) => {
      const c = costos.get(p.variante_id);
      return c !== undefined && p.precio < minimoSinPerdida(c, config.descuentoSinTarjeta);
    });
    if (bajos.length) {
      const { data: nombres } = await supabase
        .from("variantes")
        .select("id, nombre, productos(nombre)")
        .in("id", bajos.map((b) => b.variante_id));
      const nombre = (id: string) => {
        const v = (nombres ?? []).find((n) => n.id === id) as unknown as { nombre: string; productos: { nombre: string } | null } | undefined;
        return v ? `${v.productos?.nombre ?? ""} ${v.nombre}`.trim() : "un producto";
      };
      return falla(
        `${bajos.map((b) => `${nombre(b.variante_id)} a $${b.precio.toFixed(2)}`).join(", ")}: con ese precio se pierde dinero. ` +
          "Subilo al «Mínimo sin pérdida» o marcá «Acepto vender con pérdida» abajo si es a propósito."
      );
    }
  }

  const activa = form.get("activa") === "on";
  if (activa && !precios.length) return falla("Poné al menos un precio de oferta antes de activarla.");
  const { error } = await supabase.from("promociones").update({ nombre: d.nombre, inicio: d.inicio, fin: d.fin, activa }).eq("id", id);
  if (error) return falla(`No se pudo guardar: ${error.message}`);
  const { error: e1 } = await supabase.from("promocion_precios").delete().eq("promocion_id", id);
  if (e1) return falla(`No se pudieron guardar los precios: ${e1.message}`);
  if (precios.length) {
    const { error: e2 } = await supabase.from("promocion_precios").insert(precios);
    if (e2) return falla(`No se pudieron guardar los precios: ${e2.message}`);
  }
  refrescar();
  return ok(
    activa
      ? `Oferta guardada y activa con ${precios.length} ${precios.length === 1 ? "precio" : "precios"}. Ya se ve en la tienda en sus fechas.`
      : `Oferta guardada (apagada, la tienda no la muestra).`
  );
}

// ---------------------------------------------------------------------------
// Combos
// ---------------------------------------------------------------------------
/** Datos de un combo desde el formulario (crear o editar): nombre, celular, accesorios y fechas */
async function leerDatosCombo(form: FormData, supabase: Awaited<ReturnType<typeof superAdmin>>["supabase"]) {
  const nombre = texto(form.get("nombre")).slice(0, 80);
  // "producto|ram|almacenamiento": memoria vacía = cualquier memoria
  const [principal = "", ramT = "", almT = ""] = texto(form.get("producto_principal_id")).split("|");
  const memoria = almT ? { principal_ram_gb: ramT ? Number(ramT) : null, principal_almacenamiento_gb: Number(almT) } : null;
  const items = [1, 2, 3]
    .map((i) => ({ variante_id: texto(form.get(`item_${i}`)), cantidad: Math.max(1, Math.min(3, Number(numero(form.get(`cantidad_${i}`)) ?? 1))) }))
    .filter((i) => i.variante_id);
  const inicio = fechaSV(form.get("inicio"));
  const fin = fechaSV(form.get("fin"), true);
  if (nombre.length < 3) return { error: "Poné un nombre al combo (ej. Kit protección A27)." };
  if (!principal) return { error: "Elegí el producto principal." };
  if (!items.length) return { error: "Elegí al menos un accesorio." };
  if (new Set(items.map((i) => i.variante_id)).size !== items.length) return { error: "Hay un accesorio repetido." };
  if (inicio === undefined || fin === undefined) return { error: "Revisá las fechas." };
  if (inicio && fin && new Date(inicio) >= new Date(fin)) return { error: "El combo tiene que terminar después de empezar." };
  const { data: precios } = await supabase.from("variantes").select("id, precio, producto_id").in("id", items.map((i) => i.variante_id));
  if ((precios ?? []).some((v) => v.producto_id === principal)) return { error: "El producto principal no puede ser también accesorio del combo." };
  const valor = items.reduce((s, i) => s + Number(precios?.find((v) => v.id === i.variante_id)?.precio ?? 0) * i.cantidad, 0);
  return { nombre, principal, memoria, items, inicio, fin, valor };
}

const fechasCombo = (inicio: string | null, fin: string | null) => ({ inicio, fin });

export async function crearCombo(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const ahorro = numero(form.get("descuento"));
  const { supabase } = await superAdmin();
  const d = await leerDatosCombo(form, supabase);
  if ("error" in d) return falla(d.error!);
  if (!(ahorro !== null && ahorro > 0)) return falla("Escribí cuánto ahorra el cliente con el combo (en dólares).");
  // Igual al precio de los accesorios = accesorios gratis (más no se puede: el combo no baja el precio del celular)
  if (ahorro > d.valor + 0.004)
    return falla(`El ahorro no puede pasar de lo que cuestan los accesorios ($${d.valor.toFixed(2)}; con eso quedan gratis).`);
  const fechas = d.inicio || d.fin ? fechasCombo(d.inicio, d.fin) : {};
  const { data, error } = await supabase
    .from("bundles")
    .insert({
      nombre: d.nombre,
      producto_principal_id: d.principal,
      descuento: Math.round(ahorro * 100) / 100,
      activo: true,
      ...fechas,
      ...(d.memoria ?? {}),
    })
    .select("id")
    .single();
  if (error) return falla(`No se pudo crear: ${error.message}`);
  const { error: e2 } = await supabase.from("bundle_items").insert(d.items.map((i) => ({ ...i, bundle_id: data.id })));
  if (e2) {
    await supabase.from("bundles").update({ activo: false }).eq("id", data.id);
    return falla(`No se pudieron guardar los accesorios: ${e2.message}`);
  }
  refrescar();
  return ok("Combo creado y activo. Ya aparece en la ficha, en el carrito y en el inicio.");
}

/** Editar un combo: nombre, celular, accesorios, fechas y si está activo (el ahorro y los precios, en "Editar precios") */
export async function editarCombo(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const id = texto(form.get("id"));
  const activo = form.get("activo") === "on";
  const { supabase } = await superAdmin();
  const d = await leerDatosCombo(form, supabase);
  if ("error" in d) return falla(d.error!);
  const { data: actual } = await supabase.from("bundles").select("descuento").eq("id", id).single();
  if (!actual) return falla("No se encontró el combo.");
  const escrito = numero(form.get("descuento"));
  const ahorro = escrito ?? Number(actual.descuento);
  if (!(ahorro > 0)) return falla("El ahorro debe ser mayor que cero.");
  if (ahorro > d.valor + 0.004)
    return falla(
      `Con estos accesorios el ahorro ($${ahorro.toFixed(2)}) pasa de lo que cuestan ($${d.valor.toFixed(2)}). Bajá el ahorro en "Editar precios" o elegí otros accesorios.`
    );
  const { error } = await supabase
    .from("bundles")
    .update({
      nombre: d.nombre,
      producto_principal_id: d.principal,
      descuento: Math.round(ahorro * 100) / 100,
      activo,
      inicio: d.inicio,
      fin: d.fin,
      principal_ram_gb: d.memoria?.principal_ram_gb ?? null,
      principal_almacenamiento_gb: d.memoria?.principal_almacenamiento_gb ?? null,
    })
    .eq("id", id);
  if (error) return falla(`No se pudo guardar: ${error.message}`);
  // Accesorios: se reemplazan por los elegidos
  const { error: e1 } = await supabase.from("bundle_items").delete().eq("bundle_id", id);
  const { error: e2 } = e1 ? { error: e1 } : await supabase.from("bundle_items").insert(d.items.map((i) => ({ ...i, bundle_id: id })));
  if (e2) return falla(`Se guardó el combo pero no los accesorios: ${e2.message}. Volvé a guardarlo.`);
  refrescar();
  return ok(activo ? "Combo guardado." : "Combo guardado y apagado: no se ofrece en la tienda.");
}

/** Eliminar un combo (con confirmación). Los pedidos que ya lo usaron conservan su descuento y su nombre. */
export async function eliminarCombo(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const id = texto(form.get("id"));
  if (form.get("confirmar") !== "on") return falla("Marcá la casilla para confirmar que querés eliminar el combo.");
  const { supabase } = await superAdmin();
  const { error } = await supabase.from("bundles").delete().eq("id", id);
  if (error) return falla(`No se pudo eliminar: ${error.message}`);
  refrescar();
  return ok("Combo eliminado. Los pedidos que lo usaron conservan su descuento.");
}

/**
 * Guardar un combo desde su editor con precios: el ahorro, si está activo y, si cambiaron, los precios de venta del
 * celular (por memoria) y de los accesorios (cambian en toda la tienda, como en Precios).
 */
export async function guardarComboPrecios(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const id = texto(form.get("id"));
  const ahorro = numero(form.get("descuento"));
  const activo = form.get("activo") === "on";
  if (!(ahorro !== null && ahorro > 0)) return falla("El ahorro debe ser mayor que cero.");
  let precios: { productoId: string; ram: number | null; alm: number | null; precio: number }[] = [];
  try {
    precios = JSON.parse(texto(form.get("precios")) || "[]");
  } catch {
    return falla("No se pudieron leer los precios.");
  }
  if (precios.some((p) => !(Number(p.precio) > 0))) return falla("Revisá los precios: tienen que ser mayores que cero.");
  const { supabase } = await superAdmin();
  const { data: b } = await supabase
    .from("bundles")
    .select("id, bundle_items(cantidad, variantes(precio, producto_id, ram_gb, almacenamiento_gb))")
    .eq("id", id)
    .single();
  if (!b) return falla("No se encontró el combo.");
  // El ahorro no puede pasar de lo que cuestan los accesorios (con los precios nuevos)
  const items = (b.bundle_items ?? []) as unknown as {
    cantidad: number;
    variantes: { precio: number; producto_id: string; ram_gb: number | null; almacenamiento_gb: number | null } | null;
  }[];
  const valor = items.reduce((s, i) => {
    const v = i.variantes;
    if (!v) return s;
    const nuevo = precios.find((p) => p.productoId === v.producto_id && (p.ram ?? null) === v.ram_gb && (p.alm ?? null) === v.almacenamiento_gb);
    return s + Number(nuevo?.precio ?? v.precio) * i.cantidad;
  }, 0);
  if (ahorro > valor + 0.004)
    return falla(`El ahorro no puede pasar de lo que cuestan los accesorios ($${valor.toFixed(2)}; con eso quedan gratis).`);
  for (const p of precios) {
    const f = new FormData();
    f.set("productoId", p.productoId);
    f.set("ram", p.ram === null || p.ram === undefined ? "" : String(p.ram));
    f.set("alm", p.alm === null || p.alm === undefined ? "" : String(p.alm));
    f.set("precio", Number(p.precio).toFixed(2));
    f.set("razon", "combo");
    await fijarPrecio(f);
  }
  const { error } = await supabase.from("bundles").update({ descuento: Math.round(ahorro * 100) / 100, activo }).eq("id", id);
  if (error) return falla(`No se pudo guardar: ${error.message}`);
  refrescar();
  return ok(
    `${activo ? "Combo guardado" : "Combo apagado: ya no se ofrece en la tienda"}${precios.length ? ` · ${precios.length} ${precios.length === 1 ? "precio cambiado" : "precios cambiados"}` : ""}.`
  );
}

export async function guardarCombo(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const id = texto(form.get("id"));
  const ahorro = numero(form.get("descuento"));
  const activo = form.get("activo") === "on";
  if (!(ahorro !== null && ahorro > 0)) return falla("El ahorro debe ser mayor que cero.");
  const { supabase } = await superAdmin();
  const { error } = await supabase.from("bundles").update({ descuento: Math.round(ahorro * 100) / 100, activo }).eq("id", id);
  if (error) return falla(`No se pudo guardar: ${error.message}`);
  refrescar();
  return ok(activo ? "Combo guardado." : "Combo apagado: ya no se ofrece en la tienda.");
}

// ---------------------------------------------------------------------------
// Cupones
// ---------------------------------------------------------------------------
export async function crearCupon(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const codigo = normalizarCodigo(texto(form.get("codigo")));
  const tipo = texto(form.get("tipo"));
  const valor = numero(form.get("valor")) ?? 0;
  const tope = numero(form.get("tope"));
  const minimo = numero(form.get("min_pedido")) ?? 0;
  const usosMax = numero(form.get("usos_max"));
  const porCliente = numero(form.get("por_cliente"));
  const inicio = fechaSV(form.get("inicio"));
  const fin = fechaSV(form.get("fin"), true);
  if (!/^[A-Z0-9-]{3,20}$/.test(codigo)) return falla("El código lleva de 3 a 20 letras, números o guiones (ej. QUINCENA10).");
  if (!["porcentaje", "monto", "envio_gratis"].includes(tipo)) return falla("Elegí el tipo de cupón.");
  if (tipo === "porcentaje" && !(valor > 0 && valor <= 50)) return falla("El porcentaje va de 1 a 50.");
  if (tipo === "monto" && !(valor > 0)) return falla("Escribí cuántos dólares descuenta.");
  if (inicio === undefined || fin === undefined) return falla("Revisá las fechas.");
  if (inicio && fin && new Date(inicio) >= new Date(fin)) return falla("El cupón tiene que terminar después de empezar.");
  for (const [n, v] of [["mínimo", minimo], ["tope", tope], ["usos", usosMax], ["usos por cliente", porCliente]] as const) {
    if (v !== null && !(v >= 0)) return falla(`Revisá el campo ${n}.`);
  }
  const { supabase } = await superAdmin();
  const { error } = await supabase.from("cupones").insert({
    codigo,
    tipo,
    valor: tipo === "envio_gratis" ? 0 : valor,
    tope: tipo === "porcentaje" ? tope : null,
    min_pedido: minimo,
    usos_max: usosMax ? Math.round(usosMax) : null,
    por_cliente: porCliente === null ? 1 : porCliente === 0 ? null : Math.round(porCliente),
    inicio,
    fin,
    solo_accesorios: form.get("solo_accesorios") === "on",
    descripcion: texto(form.get("descripcion")).slice(0, 200) || null,
    origen: "panel",
    activo: true,
  });
  if (error) return falla(error.code === "23505" ? "Ya existe un cupón con ese código." : `No se pudo crear: ${error.message}`);
  refrescar(false);
  return ok(`Cupón ${codigo} creado y activo.`);
}

export async function cambiarCupon(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const id = texto(form.get("id"));
  const activo = texto(form.get("activo")) === "1";
  const { supabase } = await superAdmin();
  const { error } = await supabase.from("cupones").update({ activo }).eq("id", id);
  if (error) return falla(`No se pudo guardar: ${error.message}`);
  refrescar(false);
  return ok(activo ? "Cupón activado." : "Cupón apagado: ya no se puede usar.");
}

// ---------------------------------------------------------------------------
// Campañas con envío gratis (ej. "Octubre Naranja"): productos, banner del inicio y fechas
// ---------------------------------------------------------------------------
export async function crearCampanaEnvio(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const d = leerOferta(form);
  if ("error" in d) return falla(d.error!.replace("la oferta", "la campaña").replace("Quincena de octubre", "Octubre Naranja"));
  const { supabase } = await superAdmin();
  const { data, error } = await supabase
    .from("promociones")
    .insert({ tipo: "envio_gratis", nombre: d.nombre, inicio: d.inicio, fin: d.fin, activa: false, config: { banner: true } })
    .select("id")
    .single();
  if (error) return falla(`No se pudo crear: ${error.message}`);
  refrescar(false);
  redirect(`/admin/promociones/envio-gratis/${data.id}`);
}

export async function guardarCampanaEnvio(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const id = texto(form.get("id"));
  const d = leerOferta(form);
  if ("error" in d) return falla(d.error!.replace("la oferta", "la campaña"));
  const { supabase } = await superAdmin();
  // Productos en el orden en que se marcaron en la lista
  const productos = form.getAll("producto").map(String).filter((x) => /^[0-9a-f-]{36}$/.test(x));
  const destacado = texto(form.get("destacado"));
  const activa = form.get("activa") === "on";
  if (activa && !productos.length) return falla("Elegí al menos un producto antes de activarla.");
  if (destacado && !productos.includes(destacado)) return falla("El producto destacado tiene que estar marcado en la lista.");
  const config = {
    banner: form.get("banner") === "on",
    destacado: destacado || productos[0] || null,
    texto: texto(form.get("texto")).slice(0, 160) || null,
    imagen: texto(form.get("imagen")) || null,
  };
  if (config.imagen && !/^(\/[\w./-]+|https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/\S+)$/.test(config.imagen)) {
    return falla("La foto del banner tiene que estar en la tienda (/campanas/…) o subida a las fotos del catálogo.");
  }
  const { error } = await supabase.from("promociones").update({ nombre: d.nombre, inicio: d.inicio, fin: d.fin, activa, config }).eq("id", id);
  if (error) return falla(`No se pudo guardar: ${error.message}`);
  const { error: e1 } = await supabase.from("promocion_productos").delete().eq("promocion_id", id);
  if (e1) return falla(`No se pudieron guardar los productos: ${e1.message}`);
  if (productos.length) {
    const filas = productos.map((producto_id, i) => ({ promocion_id: id, producto_id, orden: producto_id === config.destacado ? -1 : i }));
    const { error: e2 } = await supabase.from("promocion_productos").insert(filas);
    if (e2) return falla(`No se pudieron guardar los productos: ${e2.message}`);
  }
  refrescar();
  return ok(
    activa
      ? `Campaña guardada y activa con ${productos.length} ${productos.length === 1 ? "producto" : "productos"} con envío gratis${config.banner ? " y banner en el inicio" : ""}.`
      : "Campaña guardada (apagada, la tienda no la muestra)."
  );
}
