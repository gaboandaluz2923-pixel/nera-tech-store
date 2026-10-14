import { Suspense } from "react";
import { BotonGuardar, FormularioAccion } from "@/components/admin/formulario-accion";
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
  valor,
  children,
}: {
  clave: string;
  titulo: string;
  descripcion: string;
  valor: unknown;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
        <CardDescription>{descripcion}</CardDescription>
      </CardHeader>
      <CardContent>
        <FormularioAccion key={JSON.stringify(valor)} accion={guardarConfiguracion} className="space-y-3">
          <input type="hidden" name="clave" value={clave} />
          {children}
          <BotonGuardar />
        </FormularioAccion>
      </CardContent>
    </Card>
  );
}

async function DatosNegocio() {
  const supabase = await createClient();
  const { data } = await supabase.from("configuracion").select("clave, valor");
  const c: Valores = Object.fromEntries((data ?? []).map((r) => [r.clave, r.valor]));
  const w = c.whatsapp ?? {};
  const e = c.envio ?? {};
  const t = c.tasa_cero ?? {};
  const n = c.negocio ?? {};
  const g = c.garantia_texto ?? {};
  const numero = String(w.numero ?? "");

  return (
    <>
      <Seccion
        clave="whatsapp"
        titulo="WhatsApp"
        descripcion="A este número llegan todos los botones de WhatsApp de la tienda, con el pedido ya escrito."
        valor={w}
      >
        <Campo
          nombre="numero"
          etiqueta="Número"
          valor={numero.startsWith("503") ? numero.slice(3) : numero}
          placeholder="7123 4567"
          ayuda={numero ? `Guardado como +${numero}.` : "Todavía no hay número: los botones abren WhatsApp sin destinatario."}
        />
      </Seccion>

      <Seccion
        clave="correo"
        titulo="Correos"
        descripcion="Desde dónde salen los correos de pedidos (Brevo) y a dónde te avisamos de cada pedido nuevo."
        valor={c.correo}
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
        valor={e}
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
        descripcion="Dónde se puede pagar en efectivo al recibir. Se muestra en fichas, inicio y Envíos y pagos."
        valor={c.municipios_contra_entrega}
      >
        <Campo
          nombre="municipios"
          etiqueta="Municipios o zonas (uno por línea)"
          valor={(c.municipios_contra_entrega ?? []).join("\n")}
          largo
          filas={4}
        />
      </Seccion>

      <Seccion clave="tasa_cero" titulo="Tasa 0%" descripcion="Se usa para calcular la cuota que ve el cliente." valor={t}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo nombre="meses" etiqueta="Hasta cuántos meses" valor={t.meses} tipo="number" />
          <Campo nombre="banco" etiqueta="Con qué tarjetas (opcional)" valor={t.banco} placeholder="Ej. tarjetas de crédito Banco Agrícola" />
        </div>
      </Seccion>

      <Seccion
        clave="cuentas_bancarias"
        titulo="Cuentas para transferencia"
        descripcion="Se muestran solo en la página del pedido de quien eligió pagar por transferencia."
        valor={c.cuentas_bancarias}
      >
        <Campo
          nombre="cuentas"
          etiqueta="Una cuenta por línea: Banco | Tipo | Número | Titular"
          valor={(Array.isArray(c.cuentas_bancarias) ? c.cuentas_bancarias : [])
            .map((k: { banco: string; tipo: string; numero: string; titular: string }) => [k.banco, k.tipo, k.numero, k.titular].join(" | "))
            .join("\n")}
          largo
          filas={3}
          placeholder="Banco Agrícola | Cuenta de ahorro | 3000000000 | Nera Tech S.A. de C.V."
        />
      </Seccion>

      <Seccion
        clave="puntos"
        titulo="Puntos Nera"
        descripcion="Programa de lealtad: se ganan cuando el pedido queda entregado y pagado, y se usan al pagar con la sesión de Google abierta."
        valor={c.puntos}
      >
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="activo" defaultChecked={Boolean(c.puntos?.activo)} className="size-4 accent-[var(--marca)]" />
          Programa activo
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo nombre="dolares_por_punto" etiqueta="1 punto por cada (USD)" valor={c.puntos?.dolares_por_punto ?? 10} ayuda="Sobre lo que pagó por los productos (sin envío)." />
          <Campo nombre="valor_punto" etiqueta="Cada punto vale (USD)" valor={c.puntos?.valor_punto ?? 0.1} />
          <Campo nombre="vence_meses" etiqueta="Los puntos vencen a los (meses)" valor={c.puntos?.vence_meses ?? 12} tipo="number" />
          <Campo nombre="minimo_canje" etiqueta="Mínimo de puntos para usarlos" valor={c.puntos?.minimo_canje ?? 0} tipo="number" ayuda="0 = desde el primer punto." />
        </div>
        <p className="text-xs text-muted-foreground">
          Con los valores de ahora el cliente recupera{" "}
          {(((Number(c.puntos?.valor_punto ?? 0.1) || 0) / (Number(c.puntos?.dolares_por_punto ?? 10) || 10)) * 100).toFixed(1)}% de lo que
          compra. Ningún canje deja un pedido bajo costo.
        </p>
      </Seccion>

      <Seccion
        clave="regalo_cumple"
        titulo="Regalo de cumpleaños"
        descripcion="Cupón personal que se crea solo en el mes de cumpleaños del cliente (si lo guardó en Mi cuenta). Le llega por correo si acepta publicidad y siempre lo ve en Mi cuenta."
        valor={c.regalo_cumple}
      >
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="activo" defaultChecked={Boolean(c.regalo_cumple?.activo)} className="size-4 accent-[var(--marca)]" />
          Regalo activo
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo nombre="monto" etiqueta="Monto del regalo (USD)" valor={c.regalo_cumple?.monto ?? 5} />
          <Campo nombre="minimo" etiqueta="Compra mínima para usarlo (USD)" valor={c.regalo_cumple?.minimo ?? 20} />
        </div>
      </Seccion>

      <Seccion
        clave="negocio"
        titulo="Datos para el pie de página"
        descripcion="NIT y dirección dan confianza: aparecen al final de todas las páginas."
        valor={n}
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
        valor={g}
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
          Datos del negocio que ve el cliente. Cada sección se guarda por separado y se ve en la tienda al instante.
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
