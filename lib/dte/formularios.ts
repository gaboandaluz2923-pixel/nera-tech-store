import { ACTIVIDADES_MH, soloDigitos, type DireccionMH } from "./catalogos";
import type { DatosFiscales } from "./emitir";

// Lectura de los formularios del panel con datos para Hacienda (emisor y cliente de crédito fiscal).

const texto = (v: FormDataEntryValue | null) => String(v ?? "").trim();

export function leerDireccion(form: FormData, prefijo: string): DireccionMH {
  return {
    departamento: texto(form.get(`${prefijo}departamento`)),
    municipio: texto(form.get(`${prefijo}municipio`)),
    distrito: texto(form.get(`${prefijo}distrito`)),
    complemento: texto(form.get(`${prefijo}complemento`)).slice(0, 180),
  };
}

/** "47412 · Venta de…" o solo "47412" → código y descripción del catálogo */
export function leerActividad(form: FormData, nombre: string): { codActividad: string; descActividad: string } {
  const v = texto(form.get(nombre));
  const codigo = v.match(/^\d{5,6}/)?.[0] ?? "";
  const a = ACTIVIDADES_MH.find((x) => x.codigo === codigo);
  return { codActividad: a?.codigo ?? "", descActividad: a?.nombre.slice(0, 150) ?? "" };
}

export function leerFiscales(form: FormData, prefijo = "f_"): DatosFiscales {
  const correo = texto(form.get(`${prefijo}correo`)).toLowerCase();
  return {
    nit: soloDigitos(texto(form.get(`${prefijo}nit`))),
    nrc: soloDigitos(texto(form.get(`${prefijo}nrc`))),
    nombre: texto(form.get(`${prefijo}nombre`)).slice(0, 250),
    nombreComercial: texto(form.get(`${prefijo}nombre_comercial`)).slice(0, 150) || null,
    ...leerActividad(form, `${prefijo}actividad`),
    direccion: leerDireccion(form, `${prefijo}dir_`),
    telefono: soloDigitos(texto(form.get(`${prefijo}telefono`))) || null,
    correo: correo || null,
    retiene1: form.get(`${prefijo}retiene1`) === "on",
  };
}
