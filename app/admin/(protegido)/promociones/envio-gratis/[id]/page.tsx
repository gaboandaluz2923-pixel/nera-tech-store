import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BotonGuardar, FormularioAccion } from "@/components/admin/formulario-accion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { superAdmin } from "@/lib/admin/sesion";
import { createClient } from "@/lib/supabase/server";
import { usd2 } from "@/lib/tienda/formato";
import { guardarCampanaEnvio } from "../../actions";
import { aLocalSV, estadoOferta } from "../../util";

// Editar una campaña con envío gratis: nombre, fechas, encendido, banner del inicio, producto destacado y
// productos que no pagan envío. Los precios no cambian aquí (se cambian en Precios u Ofertas con fecha).

type Producto = {
  id: string;
  nombre: string;
  estado: string;
  orden: number;
  categorias: { nombre: string } | null;
  variantes: { precio: number; activo: boolean; stock: number | null }[];
};

async function Editor({ params }: { params: PageProps<"/admin/promociones/envio-gratis/[id]">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  await superAdmin();
  const supabase = await createClient();
  const [{ data: c }, { data: elegidos }, { data: ps, error }] = await Promise.all([
    supabase.from("promociones").select("id, nombre, inicio, fin, activa, tipo, config").eq("id", id).maybeSingle(),
    supabase.from("promocion_productos").select("producto_id, orden").eq("promocion_id", id).order("orden"),
    supabase.from("productos").select("id, nombre, estado, orden, categorias(nombre), variantes(precio, activo, stock)").neq("estado", "oculto").order("nombre"),
  ]);
  if (error) throw error;
  if (!c || c.tipo !== "envio_gratis") notFound();
  const config = (c.config ?? {}) as { banner?: boolean; destacado?: string; texto?: string; imagen?: string };
  const marcados = new Set((elegidos ?? []).map((e) => e.producto_id as string));
  const productos = ((ps ?? []) as unknown as Producto[])
    .map((p) => {
      const vs = p.variantes.filter((v) => v.activo && Number(v.precio) > 0);
      return {
        ...p,
        desde: vs.length ? Math.min(...vs.map((v) => Number(v.precio))) : null,
        bodega: vs.reduce((s, v) => s + Math.max(0, Number(v.stock) || 0), 0),
      };
    })
    .filter((p) => p.desde !== null)
    .sort((a, b) => Number(marcados.has(b.id)) - Number(marcados.has(a.id)) || (a.categorias?.nombre ?? "").localeCompare(b.categorias?.nombre ?? "") || a.nombre.localeCompare(b.nombre));
  const estado = estadoOferta(c);

  return (
    <FormularioAccion accion={guardarCampanaEnvio} className="space-y-6">
      <input type="hidden" name="id" value={c.id} />
      <Card>
        <CardHeader>
          <CardTitle>Datos de la campaña</CardTitle>
          <CardDescription>Estado ahora: {estado}. Horas de El Salvador. Al terminar, el envío vuelve a cobrarse y el banner se quita solo.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
          <div className="space-y-1">
            <Label htmlFor="ca-nombre">Nombre (se ve en la tienda)</Label>
            <Input id="ca-nombre" name="nombre" defaultValue={c.nombre} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ca-inicio">Empieza</Label>
            <Input id="ca-inicio" name="inicio" type="datetime-local" defaultValue={aLocalSV(c.inicio)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ca-fin">Termina</Label>
            <Input id="ca-fin" name="fin" type="datetime-local" defaultValue={aLocalSV(c.fin)} />
          </div>
          <div className="space-y-1 sm:col-span-3">
            <Label htmlFor="ca-texto">Frase del banner (opcional)</Label>
            <Input id="ca-texto" name="texto" defaultValue={config.texto ?? ""} maxLength={160} placeholder="Ej. El gamer de 12 GB + 256 GB, con envío gratis a todo el país." />
          </div>
          <div className="space-y-1 sm:col-span-3">
            <Label htmlFor="ca-imagen">Foto del banner con fondo transparente (opcional)</Label>
            <Input id="ca-imagen" name="imagen" defaultValue={config.imagen ?? ""} placeholder="/campanas/infinix-gt-50-pro.webp" />
            <p className="text-xs text-muted-foreground">Si la dejás vacía se usa la foto principal del producto, sobre una tarjeta blanca.</p>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium sm:col-span-3">
            <input type="checkbox" name="banner" defaultChecked={config.banner !== false} className="size-4" />
            Mostrar el banner en el inicio (reemplaza el encabezado mientras dure)
          </label>
          <label className="flex items-center gap-2 text-sm font-medium sm:col-span-3">
            <input type="checkbox" name="activa" defaultChecked={c.activa} className="size-4" />
            Campaña activa (se muestra en la tienda dentro de sus fechas)
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Productos con envío gratis</CardTitle>
          <CardDescription>
            Un pedido no paga envío si lleva al menos uno de estos. El destacado sale en grande en el banner; los demás, debajo. Solo aparecen los
            productos publicados con precio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-lg border">
            {productos.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-2 text-sm">
                <label className="flex min-w-0 flex-1 items-center gap-2">
                  <input type="checkbox" name="producto" value={p.id} defaultChecked={marcados.has(p.id)} className="size-4" />
                  <span className="min-w-0">
                    <span className="font-medium">{p.nombre}</span>{" "}
                    <span className="text-xs text-muted-foreground">
                      {p.categorias?.nombre} · desde {usd2(p.desde!)}
                      {p.bodega ? ` · ${p.bodega} en bodega` : ""}
                    </span>
                  </span>
                </label>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input type="radio" name="destacado" value={p.id} defaultChecked={config.destacado === p.id} className="size-4" />
                  Destacado
                </label>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t bg-background py-3">
        <BotonGuardar>Guardar campaña</BotonGuardar>
        <Link href="/admin/promociones" className="text-sm text-muted-foreground hover:underline">
          Volver a Promociones
        </Link>
      </div>
    </FormularioAccion>
  );
}

export default function EditarCampanaEnvio({ params }: PageProps<"/admin/promociones/envio-gratis/[id]">) {
  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <Link href="/admin/promociones" className="text-sm text-muted-foreground hover:underline">
          ← Promociones
        </Link>
        <h1 className="text-xl font-semibold">Campaña con envío gratis</h1>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <Editor params={params} />
      </Suspense>
    </div>
  );
}
