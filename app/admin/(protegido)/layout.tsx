import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { ColumnasAjustables } from "@/components/admin/columnas-ajustables";
import { createClient } from "@/lib/supabase/server";
import { cerrarSesion } from "../login/actions";
import { rolActual } from "@/lib/admin/sesion";
import { esSoloSuperAdmin } from "@/lib/supabase/equipo";

export const metadata: Metadata = {
  title: "Panel",
  robots: { index: false, follow: false },
};

// Secciones del panel. Se van activando por fase; las que no existen aún se muestran apagadas.
// Las de administrador (lib/supabase/equipo.ts → SOLO_SUPER_ADMIN) no se le muestran al operador.
const SECCIONES: { nombre: string; href: string; fase: number }[] = [
  { nombre: "Inicio", href: "/admin", fase: 0 },
  { nombre: "Pedidos", href: "/admin/pedidos", fase: 3 },
  { nombre: "Clientes", href: "/admin/clientes", fase: 7 },
  { nombre: "Garantía (IMEI)", href: "/admin/garantia", fase: 8 },
  { nombre: "Catálogo", href: "/admin/catalogo", fase: 2 },
  { nombre: "Inventario", href: "/admin/inventario", fase: 8 },
  { nombre: "Proveedores", href: "/admin/proveedores", fase: 1 },
  { nombre: "Listas de precios", href: "/admin/listas", fase: 1 },
  { nombre: "Precios", href: "/admin/precios", fase: 1 },
  { nombre: "Promociones", href: "/admin/promociones", fase: 4 },
  { nombre: "Correos", href: "/admin/correos", fase: 4 },
  { nombre: "Analítica", href: "/admin/analitica", fase: 5 },
  { nombre: "Finanzas", href: "/admin/finanzas", fase: 9 },
  { nombre: "Facturación", href: "/admin/facturacion", fase: 10 },
  { nombre: "Equipo", href: "/admin/equipo", fase: 7 },
  { nombre: "Configuración", href: "/admin/configuracion", fase: 0 },
];

const FASE_ACTUAL = 10;

const NOMBRE_ROL = { super_admin: "Administrador", operador: "Operador" } as const;

async function Encabezado() {
  const { rol, correo } = await rolActual();
  if (!correo) redirect("/admin/login");
  if (!rol) redirect("/admin/login?aviso=sin-acceso");
  const supabase = await createClient();
  const { data: yo } = await supabase.from("equipo").select("nombre").eq("correo", correo.toLowerCase()).maybeSingle();

  return (
    <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
      <Link href="/admin" className="font-semibold">
        Nera Tech · Panel
      </Link>
      <form action={cerrarSesion} className="flex items-center gap-3 text-sm">
        <span className="hidden text-right text-muted-foreground sm:inline">
          {yo?.nombre || correo} · {NOMBRE_ROL[rol]}
        </span>
        <Link href="/admin/contrasena" className="text-muted-foreground hover:underline">
          Mi contraseña
        </Link>
        <Button type="submit" variant="outline" size="sm">
          Salir
        </Button>
      </form>
    </header>
  );
}

async function Navegacion() {
  const { rol } = await rolActual();
  const visibles = SECCIONES.filter((s) => rol === "super_admin" || !esSoloSuperAdmin(s.href));
  return (
    <ul className="flex flex-wrap gap-1 sm:flex-col">
      {visibles.map((s) => {
        const activa = s.fase <= FASE_ACTUAL;
        return (
          <li key={s.href}>
            {activa ? (
              <Link href={s.href as "/admin"} className="block rounded-md px-3 py-1.5 text-sm hover:bg-muted">
                {s.nombre}
              </Link>
            ) : (
              <span
                className="block cursor-not-allowed rounded-md px-3 py-1.5 text-sm text-muted-foreground/60"
                title={`Se activa en la fase ${s.fase}`}
              >
                {s.nombre}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Suspense fallback={<div className="h-14 border-b" />}>
        <Encabezado />
      </Suspense>
      <div className="flex flex-1 flex-col sm:flex-row">
        <nav className="border-b px-2 py-3 sm:w-56 sm:border-r sm:border-b-0">
          <Suspense fallback={<div className="h-8" />}>
            <Navegacion />
          </Suspense>
        </nav>
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
        <Suspense fallback={null}>
          <ColumnasAjustables />
        </Suspense>
      </div>
    </div>
  );
}
