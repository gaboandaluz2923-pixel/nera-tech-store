import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { cerrarSesion } from "../login/actions";
import { esDelEquipo } from "@/lib/supabase/equipo";

export const metadata: Metadata = {
  title: "Panel",
  robots: { index: false, follow: false },
};

// Secciones del panel. Se van activando por fase; las que no existen aún se muestran apagadas.
const SECCIONES: { nombre: string; href: string; fase: number }[] = [
  { nombre: "Inicio", href: "/admin", fase: 0 },
  { nombre: "Proveedores", href: "/admin/proveedores", fase: 1 },
  { nombre: "Listas de precios", href: "/admin/listas", fase: 1 },
  { nombre: "Precios", href: "/admin/precios", fase: 1 },
  { nombre: "Catálogo", href: "/admin/catalogo", fase: 2 },
  { nombre: "Pedidos", href: "/admin/pedidos", fase: 3 },
  { nombre: "Promociones", href: "/admin/promociones", fase: 4 },
  { nombre: "Correos", href: "/admin/correos", fase: 4 },
  { nombre: "Analítica", href: "/admin/analitica", fase: 5 },
  { nombre: "Configuración", href: "/admin/configuracion", fase: 0 },
];

const FASE_ACTUAL = 6;

async function Encabezado() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");
  if (!(await esDelEquipo(supabase))) redirect("/admin/login?aviso=sin-acceso");

  return (
    <header className="flex items-center justify-between border-b px-4 py-3">
      <Link href="/admin" className="font-semibold">
        Nera Tech · Panel
      </Link>
      <form action={cerrarSesion} className="flex items-center gap-3 text-sm">
        <span className="hidden text-muted-foreground sm:inline">
          {user.email}
        </span>
        <Button type="submit" variant="outline" size="sm">
          Salir
        </Button>
      </form>
    </header>
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
          <ul className="flex flex-wrap gap-1 sm:flex-col">
            {SECCIONES.map((s) => {
              const activa = s.fase <= FASE_ACTUAL;
              return (
                <li key={s.href}>
                  {activa ? (
                    <Link
                      href={s.href as "/admin"}
                      className="block rounded-md px-3 py-1.5 text-sm hover:bg-muted"
                    >
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
        </nav>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
