import { Suspense } from "react";
import { Editable } from "@/components/admin/editable";
import { BotonGuardar, FormularioAccion } from "@/components/admin/formulario-accion";
import { Dato, Datos, Lineas, siNo } from "@/components/admin/vista";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/server";
import { leerPorcentajeSinTarjeta, usd2 } from "@/lib/tienda/formato";
import { correoDePrueba, guardarConfiguracion, probarWompi } from "./actions";

// Datos del negocio que usa la tienda (se editan aquí) y estado de las variables de entorno
// (que se cargan en Vercel y nunca se muestran).
const VARIABLES: { nombre: string; para: string; publica: boolean }[] = [
  { nombre: "NEXT_PUBLIC_SITE_URL", para: "Dirección pública del sitio", publica: true },
  { nombre: "NEXT_PUBLIC_WHATSAPP_NUMERO", para: "Botones de WhatsApp", publica: true },
  { nombre: "NEXT_PUBLIC_SUPABASE_URL", para: "Base de datos", publica: true },
  { nombre: "NEXT_PUBLIC_SUPABASE_ANON_KEY", para: "Base de datos (lectura pública)", publica: true },
  { nombre: "SUPABASE_SERVICE_ROLE_KEY", para: "Base de datos (escrituras del servidor)", publica: false },
  { nombre: "WOMPI_CLIENT_ID", para: "Pagos con tarjeta (fase 3)", publica: false },
  { nombre: "WOMPI_CLIENT_SECRET", para: "Pagos con tarjeta (fase 3)", publica: false },
  { nombre: "BREVO_API_KEY", para: "Correos", publica: false },
  { nombre: "CRON_SECRET", para: "Revisión diaria: cumpleaños y avisos de stock", publica: false },
  { nombre: "NEXT_PUBLIC_GA4_ID", para: "Google Analytics (fase 5)", publica: true },
  { nombre: "NEXT_PUBLIC_META_PIXEL_ID", para: "Meta Pixel (fase 5)", publica: true },
  { nombre: "META_CONVERSIONS_TOKEN", para: "API de conversiones de Meta (fase 5)", publica: false },
  { nombre: "DTE_CERTIFICADO", para: "Facturación electrónica (fase 10): ver Facturación", publica: false },
];

type Valores = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function Campo(props: {
  nombre: string;
  etiqueta: string;
  valor: string | number | null | undefined;
  ayuda?: string;
  largo?: boolean;
  filas?: number;
  placeholder?: string;
  tipo?: string;
}) {
  const id = `cfg-${props.nombre}`;
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{props.etiqueta}</Label>
      {props.largo ? (
        <Textarea id={id} name={props.nombre} defaultValue={props.valor ?? ""} rows={props.filas ?? 3} placeholder={props.placeholder} />
      ) : (
        <Input id={id} name={props.nombre} type={props.tipo} defaultValue={props.valor ?? ""} placeholder={props.placeholder} />
      )}
      {props.ayuda ? <p className="text-xs text-muted-foreground">{props.ayuda}</p> : null}
    </div>
  );
}

function Seccion({
  clave,
  titulo,
  descripcion,
  vista,
  children,
}: {
  clave: string;
  titulo: string;
  descripcion: string;
  vista: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Editable titulo={titulo} descripcion={descripcion} accion={guardarConfiguracion} vista={vista}>
      <input type="hidden" name="clave" value={clave} />
      {children}
    </Editable>
  );
}

const dinero = (v: unknown) => (v === null || v === undefined || v === "" ? null : usd2(Number(v)));

async function DatosNegocio() {
  const supabase = await createClient();
  const { data } = await supabase.from("configuracion").select("clave, valor");
  const c: Valores = Object.fromEntries((data ?? []).map((r) => [r.clave, r.valor]));
  const w = c.whatsapp ?? {};
  const e = c.envio ?? {};
  const t = c.tasa_cero ?? {};
  const n = c.negocio ?? {};
  const g = c.garantia_texto ?? {};
  const pct = leerPorcentajeSinTarjeta(c.descuento_sin_tarjeta);
  // Contra entrega: formato viejo (lista) o nuevo ({ municipios, todo_el_pais, maximo })
  const ce = Array.isArray(c.municipios_contra_entrega)
    ? { municipios: c.municipios_contra_entrega, todo_el_pais: false, maximo: null }
    : (c.municipios_contra_entrega ?? { municipios: [], todo_el_pais: false, maximo: null });
  const numero = String(w.numero ?? "");
  const cuentas: { banco: string; tipo: string; numero: string; titular: string }[] = Array.isArray(c.cuentas_bancarias)
    ? c.cuentas_bancarias
    : [];
  const puntos = c.puntos ?? {};
  const regalo = c.regalo_cumple ?? {};

  return (
    <>
      <Seccion
        clave="whatsapp"
        titulo="WhatsApp"
        descripcion="A este número llegan todos los botones de WhatsApp de la tienda, con el pedido ya escrito."
        vista={
          <Datos>
            <Dato etiqueta="Número">{numero ? `+${numero.slice(0, 3)} ${numero.slice(3, 7)} ${numero.slice(7)}` : null}</Dato>
          </Datos>
        }
      >
        <Campo
          nombre="numero"
          etiqueta="Número"
          valor={numero.startsWith("503") ? numero.slice(3) : numero}
          placeholder="7123 4567"
          ayuda="8 dígitos, con o sin 503."
        />
      </Seccion>

      <Seccion
        clave="descuento_sin_tarjeta"
        titulo="Descuento sin tarjeta"
        descripcion="El precio publicado es el de tarjeta y tasa 0%. Al pagar en efectivo contra entrega o por transferencia se descuenta este % sobre los productos (no sobre el envío)."
        vista={
          <Datos>
            <Dato etiqueta="Descuento">{`${pct}%`}</Dato>
            <Dato etiqueta="Ejemplo">{`Un producto de $100 queda en ${usd2(100 - pct)} pagando en efectivo o por transferencia.`}</Dato>
          </Datos>
        }
      >
        <Campo
          nombre="porcentaje"
          etiqueta="Descuento (%)"
          valor={pct}
          tipo="number"
          ayuda="Ej. 6, 8 o 9. Se ve en la tienda al instante: fichas, checkout y Envíos y pagos. Los pedidos ya hechos no cambian."
        />
      </Seccion>

      <Seccion
        clave="correo"
        titulo="Correos"
        descripcion="Desde dónde salen los correos de pedidos (Brevo) y a dónde te avisamos de cada pedido nuevo."
        vista={
          <Datos>
            <Dato etiqueta="Sale desde">{c.correo?.remitente ?? "pedidos@neratechsv.com"}</Dato>
            <Dato etiqueta="Nombre que ve el cliente">{c.correo?.nombre ?? "Nera Tech"}</Dato>
            <Dato etiqueta="Las respuestas llegan a">{c.correo?.responder_a}</Dato>
            <Dato etiqueta="Avisos de pedidos nuevos a">{c.correo?.avisos_a}</Dato>
          </Datos>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo nombre="remitente" etiqueta="Sale desde" valor={c.correo?.remitente ?? "pedidos@neratechsv.com"} tipo="email" ayuda="Tiene que ser de tu dominio autenticado en Brevo." />
          <Campo nombre="nombre" etiqueta="Nombre que ve el cliente" valor={c.correo?.nombre ?? "Nera Tech"} />
          <Campo nombre="responder_a" etiqueta="Las respuestas llegan a" valor={c.correo?.responder_a} tipo="email" placeholder="tu@gmail.com" />
          <Campo nombre="avisos_a" etiqueta="Avisos de pedidos nuevos a" valor={c.correo?.avisos_a} tipo="email" placeholder="tu@gmail.com" />
        </div>
      </Seccion>
      <div className="-mt-3 flex justify-end">
        <FormularioAccion accion={correoDePrueba}>
          <BotonGuardar variant="outline" size="sm">
            Enviar correo de prueba
          </BotonGuardar>
        </FormularioAccion>
      </div>

      <Seccion
        clave="envio"
        titulo="Envío"
        descripcion="Se muestra en cada ficha junto al precio."
        vista={
          <Datos>
            <Dato etiqueta="Costo de envío">{dinero(e.costo)}</Dato>
            <Dato etiqueta="Envío gratis desde">{e.gratis_desde ? dinero(e.gratis_desde) : "Sin envío gratis"}</Dato>
            <Dato etiqueta="Gratis si incluye un accesorio">{siNo(e.gratis_con_accesorio)}</Dato>
          </Datos>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo nombre="costo" etiqueta="Costo de envío (USD)" valor={e.costo} />
          <Campo nombre="gratis_desde" etiqueta="Envío gratis desde (USD)" valor={e.gratis_desde} ayuda="Dejalo vacío si no hay envío gratis." />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="gratis_con_accesorio" defaultChecked={Boolean(e.gratis_con_accesorio)} className="size-4 accent-[var(--marca)]" />
          Envío gratis si el pedido incluye un accesorio
        </label>
      </Seccion>

      <Seccion
        clave="municipios_contra_entrega"
        titulo="Contra entrega"
        descripcion="Dónde y hasta qué monto se puede pagar en efectivo al recibir. Se muestra en fichas, inicio, checkout y Envíos y pagos."
        vista={
          <Datos>
            <Dato etiqueta="Dónde">{ce.todo_el_pais ? "En todo el país" : "Solo en los municipios de la lista"}</Dato>
            <Dato etiqueta="Monto máximo del pedido">{ce.maximo ? dinero(ce.maximo) : "Sin tope"}</Dato>
            <Dato etiqueta="Municipios que aparecen primero" ancho>
              {(ce.municipios ?? []).join(", ")}
            </Dato>
          </Datos>
        }
      >
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="todo_el_pais" defaultChecked={Boolean(ce.todo_el_pais)} className="size-4 accent-[var(--marca)]" />
          En todo el país
        </label>
        <Campo
          nombre="maximo"
          etiqueta="Monto máximo del pedido (USD)"
          valor={ce.maximo}
          ayuda="Pedidos mayores no pueden elegir efectivo: el cliente ve que se coordina por WhatsApp. Dejalo vacío si no hay tope."
        />
        <Campo
          nombre="municipios"
          etiqueta="Municipios que aparecen primero en la lista (uno por línea)"
          valor={(ce.municipios ?? []).join("\n")}
          ayuda="Si no marcás “En todo el país”, solo estos tienen contra entrega."
          largo
          filas={4}
        />
      </Seccion>

      <Seccion
        clave="tasa_cero"
        titulo="Tasa 0%"
        descripcion="Se usa para calcular la cuota que ve el cliente."
        vista={
          <Datos>
            <Dato etiqueta="Hasta cuántos meses">{t.meses ? `${t.meses} meses` : null}</Dato>
            <Dato etiqueta="Con qué tarjetas">{t.banco}</Dato>
          </Datos>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo nombre="meses" etiqueta="Hasta cuántos meses" valor={t.meses} tipo="number" />
          <Campo nombre="banco" etiqueta="Con qué tarjetas (opcional)" valor={t.banco} placeholder="Ej. tarjetas de crédito Banco Agrícola" />
        </div>
      </Seccion>

      <Seccion
        clave="cuentas_bancarias"
        titulo="Cuentas para transferencia"
        descripcion="Se muestran solo en la página del pedido de quien eligió pagar por transferencia."
        vista={
          cuentas.length ? (
            <ul className="space-y-2 text-sm">
              {cuentas.map((k, i) => (
                <li key={i} className="rounded-md border p-2">
                  <p className="font-medium">{k.banco}</p>
                  <p className="text-muted-foreground">
                    {[k.tipo, k.numero, k.titular].filter(Boolean).join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-amber-800">Todavía no hay cuentas: quien elige transferencia no ve a dónde pagar.</p>
          )
        }
      >
        <Campo
          nombre="cuentas"
          etiqueta="Una cuenta por línea: Banco | Tipo | Número | Titular"
          valor={cuentas.map((k) => [k.banco, k.tipo, k.numero, k.titular].join(" | ")).join("\n")}
          largo
          filas={3}
          placeholder="Banco Agrícola | Cuenta de ahorro | 3000000000 | Nera Tech S.A. de C.V."
        />
      </Seccion>

      <Seccion
        clave="puntos"
        titulo="Puntos Nera"
        descripcion="Programa de lealtad: se ganan cuando el pedido queda entregado y pagado, y se usan al pagar con la sesión de Google abierta."
        vista={
          <Datos>
            <Dato etiqueta="Programa">{puntos.activo ? "Activo" : "Apagado"}</Dato>
            <Dato etiqueta="1 punto por cada">{dinero(puntos.dolares_por_punto ?? 10)}</Dato>
            <Dato etiqueta="Cada punto vale">{dinero(puntos.valor_punto ?? 0.1)}</Dato>
            <Dato etiqueta="Vencen a los">{`${puntos.vence_meses ?? 12} meses`}</Dato>
            <Dato etiqueta="Mínimo para usarlos">{`${puntos.minimo_canje ?? 0} puntos`}</Dato>
            <Dato etiqueta="El cliente recupera">
              {`${(((Number(puntos.valor_punto ?? 0.1) || 0) / (Number(puntos.dolares_por_punto ?? 10) || 10)) * 100).toFixed(1)}% de lo que compra`}
            </Dato>
          </Datos>
        }
      >
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="activo" defaultChecked={Boolean(puntos.activo)} className="size-4 accent-[var(--marca)]" />
          Programa activo
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo nombre="dolares_por_punto" etiqueta="1 punto por cada (USD)" valor={puntos.dolares_por_punto ?? 10} ayuda="Sobre lo que pagó por los productos (sin envío)." />
          <Campo nombre="valor_punto" etiqueta="Cada punto vale (USD)" valor={puntos.valor_punto ?? 0.1} />
          <Campo nombre="vence_meses" etiqueta="Los puntos vencen a los (meses)" valor={puntos.vence_meses ?? 12} tipo="number" />
          <Campo nombre="minimo_canje" etiqueta="Mínimo de puntos para usarlos" valor={puntos.minimo_canje ?? 0} tipo="number" ayuda="0 = desde el primer punto." />
        </div>
        <p className="text-xs text-muted-foreground">Ningún canje deja un pedido bajo costo.</p>
      </Seccion>

      <Seccion
        clave="regalo_cumple"
        titulo="Regalo de cumpleaños"
        descripcion="Cupón personal que se crea solo en el mes de cumpleaños del cliente (si lo guardó en Mi cuenta). Le llega por correo si acepta publicidad y siempre lo ve en Mi cuenta."
        vista={
          <Datos>
            <Dato etiqueta="Regalo">{regalo.activo ? "Activo" : "Apagado"}</Dato>
            <Dato etiqueta="Monto">{dinero(regalo.monto ?? 5)}</Dato>
            <Dato etiqueta="Compra mínima para usarlo">{dinero(regalo.minimo ?? 20)}</Dato>
          </Datos>
        }
      >
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="activo" defaultChecked={Boolean(regalo.activo)} className="size-4 accent-[var(--marca)]" />
          Regalo activo
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo nombre="monto" etiqueta="Monto del regalo (USD)" valor={regalo.monto ?? 5} />
          <Campo nombre="minimo" etiqueta="Compra mínima para usarlo (USD)" valor={regalo.minimo ?? 20} />
        </div>
      </Seccion>

      <Seccion
        clave="negocio"
        titulo="Datos para el pie de página"
        descripcion="NIT y dirección dan confianza: aparecen al final de todas las páginas."
        vista={
          <Datos>
            <Dato etiqueta="Nombre comercial">{n.nombre}</Dato>
            <Dato etiqueta="NIT">{n.nit}</Dato>
            <Dato etiqueta="Dirección">{n.direccion}</Dato>
            <Dato etiqueta="Correo de contacto">{n.correo}</Dato>
          </Datos>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo nombre="nombre" etiqueta="Nombre comercial" valor={n.nombre} />
          <Campo nombre="nit" etiqueta="NIT" valor={n.nit} />
          <Campo nombre="direccion" etiqueta="Dirección" valor={n.direccion} />
          <Campo nombre="correo" etiqueta="Correo de contacto" valor={n.correo} tipo="email" />
        </div>
      </Seccion>

      <Seccion
        clave="garantia_texto"
        titulo="Garantía"
        descripcion="Texto de la página Garantía y del recuadro de garantía en cada ficha."
        vista={
          <Datos>
            <Dato etiqueta="Meses de garantía">{g.plazo_meses ? `${g.plazo_meses} meses` : null}</Dato>
            <Dato etiqueta="Días para cambio inmediato">{g.cambio_inmediato_dias ? `${g.cambio_inmediato_dias} días` : "Sin cambio inmediato"}</Dato>
            <Dato etiqueta="Resumen" ancho>
              {g.resumen}
            </Dato>
            <Dato etiqueta="Qué cubre">
              <Lineas items={g.cubre} />
            </Dato>
            <Dato etiqueta="Qué no cubre">
              <Lineas items={g.no_cubre} />
            </Dato>
            <Dato etiqueta="Cómo reclamarla" ancho>
              <Lineas items={g.como_reclamar} />
            </Dato>
            <Dato etiqueta="Nota destacada" ancho>
              {g.nota}
            </Dato>
          </Datos>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo nombre="plazo_meses" etiqueta="Meses de garantía" valor={g.plazo_meses} tipo="number" />
          <Campo
            nombre="cambio_inmediato_dias"
            etiqueta="Días para cambio inmediato"
            valor={g.cambio_inmediato_dias}
            tipo="number"
            ayuda="0 si no hay cambio directo por uno nuevo."
          />
        </div>
        <Campo nombre="resumen" etiqueta="Resumen (una línea)" valor={g.resumen} />
        <Campo nombre="cubre" etiqueta="Qué cubre (uno por línea)" valor={(g.cubre ?? []).join("\n")} largo filas={4} />
        <Campo nombre="no_cubre" etiqueta="Qué no cubre (uno por línea)" valor={(g.no_cubre ?? []).join("\n")} largo filas={5} />
        <Campo nombre="como_reclamar" etiqueta="Cómo reclamarla (un paso por línea)" valor={(g.como_reclamar ?? []).join("\n")} largo filas={3} />
        <Campo nombre="nota" etiqueta="Nota destacada" valor={g.nota} largo filas={2} />
      </Seccion>
    </>
  );
}

export default function Configuracion() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Configuración</h1>
        <p className="text-muted-foreground">
          Datos del negocio que ve el cliente. Tocá Editar en una sección, cambiá lo que necesités y Guardar: se ve en la tienda al instante.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <DatosNegocio />
      </Suspense>
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
        <h2 className="text-lg font-semibold">Conexiones</h2>
        <FormularioAccion accion={probarWompi}>
          <BotonGuardar variant="outline" size="sm">
            Probar conexión con Wompi
          </BotonGuardar>
        </FormularioAccion>
      </div>
      <p className="text-sm text-muted-foreground">
        Las claves se cargan en Vercel (Settings → Environment Variables) y nunca se muestran aquí.
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Variables de entorno</CardTitle>
          <CardDescription>
            Verde = configurada. Gris = falta (el sitio funciona sin ella hasta
            la fase indicada).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {VARIABLES.map((v) => {
              const definida = Boolean(process.env[v.nombre]);
              return (
                <li key={v.nombre} className="flex items-center gap-3 py-2">
                  <span
                    aria-hidden
                    className={`size-2.5 shrink-0 rounded-full ${
                      definida ? "bg-green-500" : "bg-muted-foreground/40"
                    }`}
                  />
                  <code className="font-mono text-xs">{v.nombre}</code>
                  <span className="ml-auto text-right text-muted-foreground">
                    {v.para}
                  </span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
