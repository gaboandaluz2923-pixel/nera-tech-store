import Link from "next/link";
import { Suspense } from "react";
import { AlertTriangle } from "lucide-react";
import { ActividadHacienda, CamposFiscales, DireccionHacienda } from "@/components/admin/campos-mh";
import { COLUMNAS_DTE, ESTADO_DTE, ListaDte, type DocDte } from "@/components/admin/documentos-dte";
import { Editable } from "@/components/admin/editable";
import { BotonGuardar, FormularioAccion } from "@/components/admin/formulario-accion";
import { Paginacion, POR_PAGINA, leerPagina } from "@/components/admin/paginacion";
import { PruebasHacienda } from "@/components/admin/pruebas-hacienda";
import { Dato, Datos, siNo } from "@/components/admin/vista";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { superAdmin } from "@/lib/admin/sesion";
import { TIPO_DOCUMENTO_ID, TIPO_DTE, TIPO_ESTABLECIMIENTO, textoDireccion, type DireccionMH } from "@/lib/dte/catalogos";
import { configDte, faltantesEmisor } from "@/lib/dte/emitir";
import { ambienteActual } from "@/lib/dte/mh";
import { META_PRUEBAS, avancePruebas } from "@/lib/dte/pruebas";
import { createServiceClient } from "@/lib/supabase/server";
import {
  enviarContingencias,
  guardarEmisor,
  guardarOpcionesDte,
  guardarReceptorPrueba,
  probarHacienda,
  tandaPruebasHacienda,
} from "./actions";

// Facturación electrónica propia (fase 10): datos del emisor, conexión con Hacienda, documentos emitidos,
// contingencia y las pruebas mínimas para que Hacienda autorice el paso a producción. Solo administradores.

type Params = { tipo?: string; estado?: string; pagina?: string; buscar?: string; ambiente?: string };

const VARIABLES = [
  { nombre: "DTE_AMBIENTE", para: "00 = pruebas, 01 = producción" },
  { nombre: "DTE_CERTIFICADO", para: "Archivo .crt de Hacienda (completo o en base64)" },
  { nombre: "DTE_CLAVE_PRIVADA", para: "Contraseña de la llave privada del certificado" },
  { nombre: "DTE_API_USUARIO", para: "Usuario de la API (tu NIT sin guiones)" },
  { nombre: "DTE_API_CLAVE", para: "Contraseña de la API de Hacienda" },
];

const SELECT = "h-9 w-full rounded-md border bg-background px-2 text-sm";

function Campo({ nombre, etiqueta, valor, ayuda, placeholder, tipo }: { nombre: string; etiqueta: string; valor?: string | null; ayuda?: string; placeholder?: string; tipo?: string }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={`e-${nombre}`}>{etiqueta}</Label>
      <Input id={`e-${nombre}`} name={nombre} defaultValue={valor ?? ""} placeholder={placeholder} type={tipo} />
      {ayuda ? <p className="text-xs text-muted-foreground">{ayuda}</p> : null}
    </div>
  );
}

const nit = (s?: string | null) => (s && s.length === 14 ? `${s.slice(0, 4)}-${s.slice(4, 10)}-${s.slice(10, 13)}-${s.slice(13)}` : (s ?? null));

async function Contenido({ searchParams }: { searchParams: Promise<Params> }) {
  await superAdmin();
  const sp = await searchParams;
  const sb = createServiceClient();
  const cfg = await configDte();
  const e = cfg.emisor;
  const faltan = faltantesEmisor(e);
  const ambiente = ambienteActual();
  const variablesListas = VARIABLES.filter((v) => v.nombre !== "DTE_AMBIENTE").every((v) => Boolean(process.env[v.nombre]));

  // Documentos con filtros
  const pagina = leerPagina(sp.pagina);
  const verAmbiente = sp.ambiente === "00" || sp.ambiente === "01" ? sp.ambiente : ambiente;
  let q = sb
    .from("dte_documentos")
    .select(COLUMNAS_DTE, { count: "exact" })
    .eq("ambiente", verAmbiente)
    .order("created_at", { ascending: false });
  if (sp.tipo && sp.tipo in TIPO_DTE) q = q.eq("tipo_dte", sp.tipo);
  if (sp.estado && sp.estado in ESTADO_DTE) q = q.eq("estado", sp.estado);
  else q = q.neq("estado", "descartado");
  if (sp.buscar?.trim()) {
    const b = sp.buscar.trim().replace(/[%,()]/g, "");
    q = q.or(`numero_control.ilike.%${b}%,codigo_generacion.ilike.%${b}%,receptor_nombre.ilike.%${b}%`);
  }
  const { data: docs, count } = await q.range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);
  const { count: enContingencia } = await sb
    .from("dte_documentos")
    .select("id", { count: "exact", head: true })
    .eq("ambiente", ambiente)
    .eq("estado", "contingencia");
  const { count: rechazados } = await sb
    .from("dte_documentos")
    .select("id", { count: "exact", head: true })
    .eq("ambiente", ambiente)
    .eq("estado", "rechazado");
  const avance = ambiente === "00" ? await avancePruebas() : null;
  const enlace = (n: number) => {
    const u = new URLSearchParams();
    if (sp.tipo) u.set("tipo", sp.tipo);
    if (sp.estado) u.set("estado", sp.estado);
    if (sp.buscar) u.set("buscar", sp.buscar);
    if (sp.ambiente) u.set("ambiente", sp.ambiente);
    if (n > 1) u.set("pagina", String(n));
    const s = u.toString();
    return `/admin/facturacion${s ? `?${s}` : ""}`;
  };

  return (
    <>
      {/* Estado general */}
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Conexión con Hacienda</CardTitle>
            <CardDescription>
              Ambiente de las claves cargadas en Vercel:{" "}
              <strong className={ambiente === "01" ? "text-green-800" : "text-amber-800"}>
                {ambiente === "01" ? "PRODUCCIÓN (documentos con valor legal)" : "PRUEBAS (sin valor legal)"}
              </strong>
            </CardDescription>
          </div>
          <FormularioAccion accion={probarHacienda}>
            <BotonGuardar variant="outline" size="sm">
              Probar conexión con Hacienda
            </BotonGuardar>
          </FormularioAccion>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="divide-y text-sm">
            {VARIABLES.map((v) => {
              const definida = Boolean(process.env[v.nombre]);
              return (
                <li key={v.nombre} className="flex items-center gap-3 py-2">
                  <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${definida ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                  <code className="font-mono text-xs">{v.nombre}</code>
                  <span className="ml-auto text-right text-muted-foreground">{v.para}</span>
                </li>
              );
            })}
          </ul>
          {!variablesListas ? (
            <p className="text-sm text-muted-foreground">
              Las claves se cargan en Vercel → Settings → Environment Variables (nunca en el chat ni aquí). Te guío paso a paso cuando Hacienda apruebe tu
              solicitud y descargués el certificado.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* Datos del emisor */}
      <Editable
        titulo="Datos del emisor"
        descripcion="Como aparecen en tu registro de IVA. Salen en cada factura y Hacienda los compara con su base."
        accion={guardarEmisor}
        vista={
          <div className="space-y-3">
            {faltan.length ? (
              <p className="flex items-start gap-2 rounded-md bg-amber-50 p-2 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> Falta: {faltan.join(", ")}.
              </p>
            ) : null}
            <Datos>
              <Dato etiqueta="Razón social">{e.nombre}</Dato>
              <Dato etiqueta="Nombre comercial">{e.nombreComercial}</Dato>
              <Dato etiqueta="NIT">{nit(e.nit)}</Dato>
              <Dato etiqueta="NRC">{e.nrc}</Dato>
              <Dato etiqueta="Actividad económica" ancho>
                {e.codActividad ? `${e.codActividad} · ${e.descActividad}` : null}
              </Dato>
              <Dato etiqueta="Dirección" ancho>
                {textoDireccion(e.direccion as DireccionMH)}
              </Dato>
              <Dato etiqueta="Teléfono">{e.telefono}</Dato>
              <Dato etiqueta="Correo">{e.correo}</Dato>
              <Dato etiqueta="Establecimiento y punto de venta (Hacienda)">
                {e.codEstable ? `${e.codEstable} · ${e.codPuntoVenta} (${TIPO_ESTABLECIMIENTO[e.tipoEstablecimiento ?? ""] ?? "—"})` : null}
              </Dato>
              <Dato etiqueta="Responsable de la facturación">
                {e.responsable?.nombre ? `${e.responsable.nombre} · ${TIPO_DOCUMENTO_ID[e.responsable.tipoDoc] ?? ""} ${e.responsable.numDoc}` : null}
              </Dato>
            </Datos>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo nombre="nombre" etiqueta="Razón social" valor={e.nombre} placeholder="NERA TECH SV, S.A.S. DE C.V." />
          <Campo nombre="nombre_comercial" etiqueta="Nombre comercial" valor={e.nombreComercial} placeholder="Nera Tech" />
          <Campo nombre="nit" etiqueta="NIT" valor={nit(e.nit)} placeholder="0623-090426-116-2" />
          <Campo nombre="nrc" etiqueta="NRC (registro de IVA)" valor={e.nrc} />
          <Campo nombre="telefono" etiqueta="Teléfono" valor={e.telefono} placeholder="6991 6160" />
          <Campo nombre="correo" etiqueta="Correo" valor={e.correo} tipo="email" placeholder="facturas@neratechsv.com" />
        </div>
        <ActividadHacienda nombre="actividad" valor={e.codActividad} />
        <DireccionHacienda prefijo="dir_" valor={e.direccion} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Campo nombre="cod_estable" etiqueta="Código del establecimiento" valor={e.codEstable ?? "M001"} ayuda="El que te asignó Hacienda (ej. M001 = casa matriz)." />
          <Campo nombre="cod_punto" etiqueta="Código del punto de venta" valor={e.codPuntoVenta ?? "P001"} ayuda="Ej. P001." />
          <div className="space-y-1">
            <Label htmlFor="e-tipo_establecimiento">Tipo de establecimiento</Label>
            <select id="e-tipo_establecimiento" name="tipo_establecimiento" className={SELECT} defaultValue={e.tipoEstablecimiento ?? "02"}>
              {Object.entries(TIPO_ESTABLECIMIENTO).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-sm font-medium">Responsable de la facturación (va en las anulaciones y contingencias)</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Campo nombre="resp_nombre" etiqueta="Nombre" valor={e.responsable?.nombre} />
          <div className="space-y-1">
            <Label htmlFor="e-resp_tipo">Documento</Label>
            <select id="e-resp_tipo" name="resp_tipo" className={SELECT} defaultValue={e.responsable?.tipoDoc ?? "13"}>
              <option value="13">DUI</option>
              <option value="36">NIT</option>
              <option value="03">Pasaporte</option>
            </select>
          </div>
          <Campo nombre="resp_doc" etiqueta="Número" valor={e.responsable?.numDoc} />
        </div>
      </Editable>

      {/* Opciones */}
      <Editable
        titulo="Cómo se emite"
        descripcion="Mientras esté apagado, se sigue usando el otro sistema y se anota la factura a mano en cada pedido."
        accion={guardarOpcionesDte}
        vista={
          <Datos>
            <Dato etiqueta="Facturación propia">{cfg.activo ? "Encendida" : "Apagada"}</Dato>
            <Dato etiqueta="Emitir sola al quedar pagado">
              {siNo(cfg.automatica)}
              {cfg.automatica && ambiente !== "01" ? " (se activa con las claves de producción)" : ""}
            </Dato>
          </Datos>
        }
      >
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="activo" defaultChecked={cfg.activo} className="mt-0.5 size-4 accent-[var(--marca)]" />
          <span>
            <strong>Facturación propia encendida.</strong> En cada pedido aparece “Emitir factura” y “Emitir crédito fiscal”.
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="automatica" defaultChecked={cfg.automatica} className="mt-0.5 size-4 accent-[var(--marca)]" />
          <span>
            <strong>Emitir sola</strong> la factura cuando el pedido queda pagado y confirmado (contra entrega: al marcarlo entregado). El crédito
            fiscal sale solo si el cliente ya tiene sus datos fiscales completos. Solo funciona en producción.
          </span>
        </label>
      </Editable>

      {/* Pendientes */}
      {(enContingencia ?? 0) > 0 || (rechazados ?? 0) > 0 ? (
        <Card className="border-amber-300">
          <CardHeader className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>Pendientes</CardTitle>
              <CardDescription>
                {enContingencia ? `${enContingencia} en contingencia (hay que reportarlos dentro de 24 horas de que Hacienda vuelva). ` : ""}
                {rechazados ? `${rechazados} rechazados: revisá el motivo, corregí y reenviá.` : ""}
              </CardDescription>
            </div>
            {enContingencia ? (
              <FormularioAccion accion={enviarContingencias}>
                <BotonGuardar size="sm">Reportar y enviar contingencia</BotonGuardar>
              </FormularioAccion>
            ) : null}
          </CardHeader>
        </Card>
      ) : null}

      {/* Documentos */}
      <Card>
        <CardHeader>
          <CardTitle>Documentos emitidos</CardTitle>
          <CardDescription>Cada uno con su PDF, su JSON (firma y sello) y el enlace de consulta pública de Hacienda.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <form className="flex flex-wrap items-end gap-2" action="/admin/facturacion">
            <div className="min-w-48 flex-1 space-y-1">
              <Label htmlFor="buscar">Buscar</Label>
              <Input id="buscar" name="buscar" defaultValue={sp.buscar ?? ""} placeholder="Número de control, código o cliente" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="f-tipo">Tipo</Label>
              <select id="f-tipo" name="tipo" className={SELECT} defaultValue={sp.tipo ?? ""}>
                <option value="">Todos</option>
                {Object.entries(TIPO_DTE).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="f-estado">Estado</Label>
              <select id="f-estado" name="estado" className={SELECT} defaultValue={sp.estado ?? ""}>
                <option value="">Todos</option>
                {Object.entries(ESTADO_DTE).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.texto}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="f-ambiente">Ambiente</Label>
              <select id="f-ambiente" name="ambiente" className={SELECT} defaultValue={verAmbiente}>
                <option value="01">Producción</option>
                <option value="00">Pruebas</option>
              </select>
            </div>
            <button type="submit" className="h-9 rounded-md border px-3 text-sm hover:bg-muted">
              Filtrar
            </button>
          </form>
          <ListaDte docs={(docs ?? []) as unknown as DocDte[]} admin />
          <Paginacion pagina={pagina} total={count ?? 0} enlace={enlace} />
        </CardContent>
      </Card>

      {/* Pruebas de Hacienda */}
      {avance ? (
        <Card>
          <CardHeader>
            <CardTitle>Pruebas para Hacienda</CardTitle>
            <CardDescription>
              Antes de autorizarte a producción, Hacienda pide estas pruebas con sello en el ambiente de pruebas. El botón las envía solas, en tandas, con
              productos del catálogo; no tocan pedidos ni clientes reales. Cuando estén completas, pedí la autorización en el portal de Hacienda.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PruebasHacienda
              accion={tandaPruebasHacienda}
              inicial={avance}
              metas={{ ...META_PRUEBAS }}
              habilitado={variablesListas && !faltan.length}
            />
            {!variablesListas || faltan.length ? (
              <p className="text-sm text-muted-foreground">Se habilita cuando estén las claves en Vercel y los datos del emisor completos.</p>
            ) : null}
            <Editable
              titulo="Cliente de prueba para créditos fiscales"
              descripcion="A nombre de quién salen los créditos fiscales y notas de crédito de prueba. Si lo dejás vacío, salen a nombre de Nera Tech."
              accion={guardarReceptorPrueba}
              vista={
                <Datos>
                  <Dato etiqueta="Cliente">{cfg.receptorPrueba ? `${cfg.receptorPrueba.nombre} · NIT ${nit(cfg.receptorPrueba.nit)}` : "Nera Tech (el mismo emisor)"}</Dato>
                </Datos>
              }
            >
              <CamposFiscales valor={cfg.receptorPrueba} conRetencion={false} />
            </Editable>
          </CardContent>
        </Card>
      ) : null}

      <p className="text-sm text-muted-foreground">
        ¿Dudas sobre un documento? Abrí el pedido en <Link href="/admin/pedidos" className="text-primary hover:underline">Pedidos</Link>: ahí se emite, se reenvía y se anula.
      </p>
    </>
  );
}

export default function Facturacion(props: PageProps<"/admin/facturacion">) {
  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Facturación electrónica</h1>
        <p className="text-sm text-muted-foreground">
          Facturas, créditos fiscales y notas de crédito propios, firmados y enviados a Hacienda desde la tienda. Solo administradores.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <Contenido searchParams={props.searchParams as Promise<Params>} />
      </Suspense>
    </div>
  );
}
