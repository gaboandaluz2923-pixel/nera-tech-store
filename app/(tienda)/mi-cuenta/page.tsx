import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MapPin, Package } from "lucide-react";
import { BotonGuardar, FormularioAccion } from "@/components/admin/formulario-accion";
import { BotonGoogle } from "@/components/tienda/boton-google";
import { FormularioDireccion } from "@/components/tienda/formulario-direccion";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { perfilDeUsuario } from "@/lib/tienda/cuentas";
import { configTienda } from "@/lib/tienda/datos";
import { DEPARTAMENTOS, OTRA_ZONA } from "@/lib/tienda/pedidos";
import { salir } from "../mis-pedidos/actions";
import { cambiarDireccion, guardarPerfil, guardarPreferencias } from "./actions";

export const metadata: Metadata = { title: "Mi cuenta", robots: { index: false, follow: false } };

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const entrada = "h-11 w-full rounded-lg border bg-background px-3 text-base";

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border p-4 sm:p-5">
      <h2 className="text-lg font-bold">{titulo}</h2>
      {children}
    </section>
  );
}

async function Contenido() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div className="max-w-sm space-y-4">
        <p className="text-muted-foreground">
          Entrá con Google para guardar tus datos y direcciones, ver tus pedidos y comprar más rápido. No necesitás cuenta para comprar.
        </p>
        <BotonGoogle volver="/mi-cuenta" />
      </div>
    );
  }
  const [perfil, c] = await Promise.all([perfilDeUsuario(user), configTienda()]);
  const zonas = c.municipiosContraEntrega;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>Entraste como {user.email}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/mis-pedidos" />}>
            <Package className="size-4" /> Mis pedidos
          </Button>
          <form action={salir}>
            <Button type="submit" variant="ghost" size="sm">
              Salir
            </Button>
          </form>
        </div>
      </div>

      <Seccion titulo="Tus datos">
        <FormularioAccion key={JSON.stringify([perfil.nombre, perfil.telefono, perfil.telefono_alterno, perfil.cumple_dia, perfil.cumple_mes])} accion={guardarPerfil} className="space-y-3">
          <label className="block space-y-1 text-sm font-medium">
            <span>Nombre y apellido</span>
            <input name="nombre" defaultValue={perfil.nombre} autoComplete="name" className={entrada} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium">
              <span>Teléfono (WhatsApp)</span>
              <input name="telefono" type="tel" inputMode="tel" defaultValue={perfil.telefono ?? ""} placeholder="7123 4567" className={entrada} />
            </label>
            <label className="space-y-1 text-sm font-medium">
              <span>Teléfono alterno (opcional)</span>
              <input name="telefono_alterno" type="tel" inputMode="tel" defaultValue={perfil.telefono_alterno ?? ""} placeholder="Otro número para la entrega" className={entrada} />
            </label>
          </div>
          <fieldset className="space-y-1">
            <legend className="text-sm font-medium">Tu cumpleaños (opcional)</legend>
            <div className="grid grid-cols-2 gap-3 sm:max-w-xs">
              <select name="cumple_dia" defaultValue={perfil.cumple_dia ?? ""} aria-label="Día" className={entrada}>
                <option value="">Día</option>
                {Array.from({ length: 31 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
              <select name="cumple_mes" defaultValue={perfil.cumple_mes ?? ""} aria-label="Mes" className={entrada}>
                <option value="">Mes</option>
                {MESES.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-muted-foreground">Solo día y mes. En tu cumpleaños te tenemos un regalo.</p>
          </fieldset>
          <BotonGuardar>Guardar</BotonGuardar>
        </FormularioAccion>
      </Seccion>

      <Seccion titulo="Direcciones de entrega">
        {perfil.direcciones.length ? (
          <ul className="space-y-3">
            {perfil.direcciones.map((d) => (
              <li key={d.id} className="rounded-xl border p-3">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 size-5 shrink-0 text-marca" aria-hidden />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-semibold">
                      {d.nombre}
                      {d.principal ? <span className="ml-2 rounded-full bg-marca/10 px-2 py-0.5 text-xs font-medium text-marca">Por defecto</span> : null}
                    </p>
                    <p>{d.direccion}</p>
                    <p className="text-muted-foreground">
                      {[d.municipio, d.departamento].filter(Boolean).join(", ")}
                      {d.referencia ? ` · Ref.: ${d.referencia}` : ""}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 pl-8">
                  <details className="w-full">
                    <summary className="cursor-pointer text-sm font-medium text-primary">Editar</summary>
                    <div className="mt-3">
                      <FormularioDireccion d={d} zonas={zonas} departamentos={DEPARTAMENTOS} otraZona={OTRA_ZONA} />
                    </div>
                  </details>
                  {!d.principal ? (
                    <FormularioAccion accion={cambiarDireccion}>
                      <input type="hidden" name="id" value={d.id} />
                      <BotonGuardar variant="ghost" size="sm" name="accion" value="principal">
                        Usar por defecto
                      </BotonGuardar>
                    </FormularioAccion>
                  ) : null}
                  <FormularioAccion accion={cambiarDireccion}>
                    <input type="hidden" name="id" value={d.id} />
                    <BotonGuardar variant="ghost" size="sm" name="accion" value="borrar" className="text-destructive">
                      Borrar
                    </BotonGuardar>
                  </FormularioAccion>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Guardá tu dirección y al comprar se llena sola.</p>
        )}
        {perfil.direcciones.length < 5 ? (
          <details open={perfil.direcciones.length === 0} className="rounded-xl bg-muted/40 p-3">
            <summary className="cursor-pointer font-medium">+ Agregar una dirección</summary>
            <div className="mt-3">
              <FormularioDireccion key={perfil.direcciones.length} zonas={zonas} departamentos={DEPARTAMENTOS} otraZona={OTRA_ZONA} />
            </div>
          </details>
        ) : null}
      </Seccion>

      <Seccion titulo="Ofertas y avisos">
        <FormularioAccion key={`${perfil.acepta_whatsapp}-${perfil.acepta_correo}`} accion={guardarPreferencias} className="space-y-3">
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="acepta_whatsapp" defaultChecked={perfil.acepta_whatsapp} className="mt-0.5 size-4 accent-[var(--marca)]" />
            Quiero recibir ofertas por WhatsApp
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="acepta_correo" defaultChecked={perfil.acepta_correo} className="mt-0.5 size-4 accent-[var(--marca)]" />
            Quiero recibir ofertas por correo
          </label>
          <p className="text-xs text-muted-foreground">Los avisos de tus pedidos y facturas te llegan siempre. Podés cambiar esto cuando quieras.</p>
          <BotonGuardar>Guardar</BotonGuardar>
        </FormularioAccion>
      </Seccion>
      <p className="text-center text-xs text-muted-foreground">
        <Link href="/privacidad" className="underline">
          Cómo usamos tus datos
        </Link>
      </p>
    </div>
  );
}

export default function MiCuenta() {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 pb-16">
      <h1 className="mb-4 text-2xl font-bold">Mi cuenta</h1>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-muted" />}>
        <Contenido />
      </Suspense>
    </div>
  );
}
