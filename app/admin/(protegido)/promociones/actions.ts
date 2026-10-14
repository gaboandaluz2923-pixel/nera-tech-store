"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoAccion } from "@/components/admin/formulario-accion";
import { equipo } from "@/lib/admin/sesion";
import { normalizarCodigo } from "@/lib/tienda/beneficios";
import { ETIQUETA_CATALOGO } from "@/lib/tienda/datos";

// Promociones del panel: ofertas con fecha, combos y cupones.
// Nada se borra: las ofertas, combos y cupones se apagan (así el historial de pedidos queda intacto).

const texto = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const numero = (v: FormDataEntryValue | null) => {
  const t = texto(v).replace(/[$,\s%]/g, "");
  return t === "" ? null : Number(t);
};
/** "2026-10-18T23:59" (hora de El Salvador, UTC−6 todo el año) → ISO */
const fechaSV = (v: FormDataEntryValue | null) => {
  const t = texto(v);
  if (!t) return null;
  const d = new Date(`${t.length === 10 ? `${t}T00:00` : t}:00-06:00`);
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
  const fin = fechaSV(form.get("fin"));
  if (nombre.length < 3) return { error: "Poné un nombre a la oferta (ej. Quincena de octubre)." };
  if (inicio === undefined || fin === undefined) return { error: "Revisá las fechas." };
  if (!fin) return { error: "Elegí cuándo termina la oferta: así el precio vuelve solo a la normalidad." };
  if (inicio && new Date(inicio) >= new Date(fin)) return { error: "La oferta tiene que terminar después de empezar." };
  return { nombre, inicio, fin };
}

export async function crearOferta(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const d = leerOferta(form);
  if ("error" in d) return falla(d.error!);
  const { supabase } = await equipo();
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
  const { supabase } = await equipo();

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
export async function crearCombo(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const nombre = texto(form.get("nombre")).slice(0, 80);
  const principal = texto(form.get("producto_principal_id"));
  const ahorro = numero(form.get("descuento"));
  const items = [1, 2, 3]
    .map((i) => ({ variante_id: texto(form.get(`item_${i}`)), cantidad: Math.max(1, Math.min(3, Number(numero(form.get(`cantidad_${i}`)) ?? 1))) }))
    .filter((i) => i.variante_id);
  if (nombre.length < 3) return falla("Poné un nombre al combo (ej. Kit protección A27).");
  if (!principal) return falla("Elegí el producto principal.");
  if (!items.length) return falla("Elegí al menos un accesorio.");
  if (new Set(items.map((i) => i.variante_id)).size !== items.length) return falla("Hay un accesorio repetido.");
  if (!(ahorro !== null && ahorro > 0)) return falla("Escribí cuánto ahorra el cliente con el combo (en dólares).");
  const { supabase } = await equipo();
  const { data: precios } = await supabase.from("variantes").select("id, precio, producto_id").in("id", items.map((i) => i.variante_id));
  if ((precios ?? []).some((v) => v.producto_id === principal)) return falla("El producto principal no puede ser también accesorio del combo.");
  const valor = items.reduce((s, i) => s + Number(precios?.find((v) => v.id === i.variante_id)?.precio ?? 0) * i.cantidad, 0);
  if (ahorro >= valor) return falla(`El ahorro debe ser menor que lo que cuestan los accesorios ($${valor.toFixed(2)}).`);
  const { data, error } = await supabase
    .from("bundles")
    .insert({ nombre, producto_principal_id: principal, descuento: Math.round(ahorro * 100) / 100, activo: true })
    .select("id")
    .single();
  if (error) return falla(`No se pudo crear: ${error.message}`);
  const { error: e2 } = await supabase.from("bundle_items").insert(items.map((i) => ({ ...i, bundle_id: data.id })));
  if (e2) {
    await supabase.from("bundles").update({ activo: false }).eq("id", data.id);
    return falla(`No se pudieron guardar los accesorios: ${e2.message}`);
  }
  refrescar();
  return ok("Combo creado y activo. Ya aparece en la ficha y en el carrito.");
}

export async function guardarCombo(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const id = texto(form.get("id"));
  const ahorro = numero(form.get("descuento"));
  const activo = form.get("activo") === "on";
  if (!(ahorro !== null && ahorro > 0)) return falla("El ahorro debe ser mayor que cero.");
  const { supabase } = await equipo();
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
  const fin = fechaSV(form.get("fin"));
  if (!/^[A-Z0-9-]{3,20}$/.test(codigo)) return falla("El código lleva de 3 a 20 letras, números o guiones (ej. QUINCENA10).");
  if (!["porcentaje", "monto", "envio_gratis"].includes(tipo)) return falla("Elegí el tipo de cupón.");
  if (tipo === "porcentaje" && !(valor > 0 && valor <= 50)) return falla("El porcentaje va de 1 a 50.");
  if (tipo === "monto" && !(valor > 0)) return falla("Escribí cuántos dólares descuenta.");
  if (inicio === undefined || fin === undefined) return falla("Revisá las fechas.");
  if (inicio && fin && new Date(inicio) >= new Date(fin)) return falla("El cupón tiene que terminar después de empezar.");
  for (const [n, v] of [["mínimo", minimo], ["tope", tope], ["usos", usosMax], ["usos por cliente", porCliente]] as const) {
    if (v !== null && !(v >= 0)) return falla(`Revisá el campo ${n}.`);
  }
  const { supabase } = await equipo();
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
  const { supabase } = await equipo();
  const { error } = await supabase.from("cupones").update({ activo }).eq("id", id);
  if (error) return falla(`No se pudo guardar: ${error.message}`);
  refrescar(false);
  return ok(activo ? "Cupón activado." : "Cupón apagado: ya no se puede usar.");
}
