import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ContadorMarcadas, MarcarTodos } from "@/components/admin/marcar-todos";
import { createClient } from "@/lib/supabase/server";
import { lineasPendientes, todo } from "@/lib/admin/catalogo";
import { interpretar } from "@/lib/listas/normalizar";
import { asociarLinea, crearEnCatalogo, dejarDeIgnorar, ignorarLineas } from "../actions";

// Categorías que por defecto NO se marcan para crear (se pueden marcar a mano): "otros" es lo que el
// sistema no supo clasificar (paneles solares, power banks…); conviene revisarlo antes de crearlo.
const NO_MARCAR = new Set(["otros"]);

type Ignorado = { proveedor_id: string; sku_proveedor: string; descripcion: string | null; created_at: string; proveedores: { nombre: string } | null };

const fechaCorta = (s: string) =>
  new Intl.DateTimeFormat("es-SV", { day: "numeric", month: "short", year: "numeric", timeZone: "America/El_Salvador" }).format(new Date(s));

/** Lo que se marcó "Ignorar": se puede volver a mostrar en Emparejar (por si se ignoró por error). */
async function Ignoradas() {
  const supabase = await createClient();
  const ignorados = (await todo((a, b) =>
    supabase
      .from("skus_ignorados")
      .select("proveedor_id, sku_proveedor, descripcion, created_at, proveedores(nombre)")
      .order("created_at", { ascending: false })
      .order("sku_proveedor")
      .range(a, b)
  )) as unknown as Ignorado[];
  if (ignorados.length === 0) return null;
  return (
    <details id="ignoradas" className="rounded-lg border p-3">
      <summary className="cursor-pointer text-sm font-medium">
        Ignoradas ({ignorados.length}) · si ignoraste algo por error, volvé a mostrarlo aquí
      </summary>
      <form id="form-ignoradas" action={dejarDeIgnorar} className="mt-3 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="outline">
            Volver a mostrar las marcadas
          </Button>
          <ContadorMarcadas formId="form-ignoradas" nombre="ignorados" />
          <span className="text-xs text-muted-foreground">Vuelven a esta pantalla para crearlas o asociarlas.</span>
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs">
              <tr>
                <th className="w-8 p-2">
                  <MarcarTodos formId="form-ignoradas" nombre="ignorados" />
                </th>
                <th className="p-2">Proveedor</th>
                <th className="p-2">Descripción del proveedor</th>
                <th className="p-2">Ignorada el</th>
              </tr>
            </thead>
            <tbody>
              {ignorados.map((g) => (
                <tr key={`${g.proveedor_id}::${g.sku_proveedor}`} className="border-t">
                  <td className="p-2">
                    <input
                      type="checkbox"
                      name="ignorados"
                      value={`${g.proveedor_id}::${g.sku_proveedor}`}
                      aria-label={`Volver a mostrar ${g.descripcion ?? g.sku_proveedor}`}
                      className="size-4"
                    />
                  </td>
                  <td className="p-2 whitespace-nowrap">{g.proveedores?.nombre ?? ""}</td>
                  <td className="p-2">{g.descripcion ?? g.sku_proveedor.replace(/^(sku|desc):/, "")}</td>
                  <td className="p-2 whitespace-nowrap text-muted-foreground">{fechaCorta(g.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </form>
    </details>
  );
}

async function Contenido() {
  const supabase = await createClient();
  const [pendientes, variantes] = await Promise.all([
    lineasPendientes(supabase),
    todo((a, b) =>
      supabase
        .from("variantes")
        .select("id, nombre, productos(nombre, marca)")
        .order("id")
        .range(a, b)
    ),
  ]);

  if (pendientes.length === 0) {
    return (
      <div className="space-y-3">
        <p>No hay nada pendiente: todas las líneas vigentes están en tu catálogo o ignoradas.</p>
        <Button variant="outline" nativeButton={false} render={<Link href="/admin/precios" />}>
          Ver precios
        </Button>
        <Ignoradas />
      </div>
    );
  }

  type Var = { id: string; nombre: string; productos: { nombre: string; marca: string } | null };
  const porMarca = new Map<string, { id: string; etiqueta: string }[]>();
  for (const v of variantes as Var[]) {
    const marca = v.productos?.marca ?? "";
    const lista = porMarca.get(marca) ?? [];
    lista.push({ id: v.id, etiqueta: `${v.productos?.nombre ?? ""} · ${v.nombre}` });
    porMarca.set(marca, lista);
  }
  for (const l of porMarca.values()) l.sort((a, b) => a.etiqueta.localeCompare(b.etiqueta));

  const filas = pendientes
    .map((l) => ({ ...l, i: interpretar(l.descripcion) }))
    .sort(
      (a, b) =>
        a.i.categoria.localeCompare(b.i.categoria) ||
        a.i.nombreProducto.localeCompare(b.i.nombreProducto) ||
        a.i.nombreVariante.localeCompare(b.i.nombreVariante)
    );

  return (
    <>
      <form id="principal" className="space-y-4">
        <div className="sticky top-0 z-10 flex flex-wrap gap-2 border-b bg-background py-3">
          <Button type="submit" formAction={crearEnCatalogo}>
            Crear los marcados en el catálogo
          </Button>
          <Button type="submit" variant="outline" formAction={ignorarLineas}>
            Ignorar los marcados
          </Button>
          <ContadorMarcadas formId="principal" />
          <span className="self-center text-xs text-muted-foreground">
            Se crean ocultos: no aparecen en la tienda hasta que los publiqués en Catálogo.
          </span>
        </div>
        <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
          <li>
            Vienen marcadas las líneas que entendí como celular, tablet, audífonos, bocina, cargador, etc. Las de categoría{" "}
            <strong>otros</strong> (lo que no supe clasificar) vienen sin marcar para que las revisés: marcalas a mano o con la
            casilla de arriba de la tabla.
          </li>
          <li>
            Antes de crear, podés corregir el <strong>nombre del producto</strong> en su casilla (ej. «Infinix Hot 70»). Si el
            nombre corregido es el de un producto que ya tenés, la opción se agrega a ese producto. Después se cambia en
            Catálogo → el producto → Editar.
          </li>
        </ul>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs">
              <tr>
                <th className="w-8 p-2">
                  <MarcarTodos formId="principal" />
                </th>
                <th className="p-2">Proveedor</th>
                <th className="p-2">Descripción del proveedor</th>
                <th className="p-2 text-right">Precio</th>
                <th className="p-2">Se creará como (podés corregir el nombre)</th>
                <th className="p-2">…o asociar a uno existente</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((l) => {
                const opciones = porMarca.get(l.i.marca) ?? [];
                return (
                  <tr key={l.id} className="border-t align-top">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        name="ids"
                        value={l.id}
                        defaultChecked={!NO_MARCAR.has(l.i.categoria)}
                        aria-label={`Marcar ${l.descripcion}`}
                        className="size-4"
                      />
                    </td>
                    <td className="p-2 whitespace-nowrap">{l.proveedor}</td>
                    <td className="p-2">
                      {l.descripcion}
                      {l.stock !== null ? (
                        <span className="ml-1 text-xs text-muted-foreground">({l.stock} disp.)</span>
                      ) : null}
                    </td>
                    <td className="p-2 text-right tabular-nums">${Number(l.precio).toFixed(2)}</td>
                    <td className="min-w-56 p-2">
                      <input
                        name={`nombre_${l.id}`}
                        defaultValue={l.i.nombreProducto}
                        maxLength={120}
                        aria-label={`Nombre del producto para ${l.descripcion}`}
                        className="h-8 w-full rounded-md border bg-background px-2 text-sm font-medium"
                      />
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {l.i.nombreVariante} <Badge variant="secondary">{l.i.categoria}</Badge>
                      </span>
                    </td>
                    <td className="p-2">
                      {opciones.length ? (
                        <div className="flex gap-1">
                          <select
                            name="varianteId"
                            form={`asociar-${l.id}`}
                            className="h-8 max-w-56 rounded-md border bg-background px-1 text-xs"
                            defaultValue=""
                          >
                            <option value="" disabled>
                              Elegí…
                            </option>
                            {opciones.map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.etiqueta}
                              </option>
                            ))}
                          </select>
                          <Button type="submit" size="sm" variant="outline" form={`asociar-${l.id}`}>
                            Asociar
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </form>
      {/* Formularios de "Asociar" fuera del principal (HTML no permite formularios anidados) */}
      {filas.map((l) => (
        <form key={l.id} id={`asociar-${l.id}`} action={asociarLinea} hidden>
          <input type="hidden" name="lineaId" value={l.id} />
        </form>
      ))}
      <Ignoradas />
    </>
  );
}

export default function Emparejar() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Emparejar líneas nuevas</h1>
        <p className="text-muted-foreground">
          Revisá cómo entendí cada línea. Lo marcado se crea en tu catálogo y queda vinculado al proveedor;
          las próximas listas lo actualizan solas. Si un equipo ya existe con otro nombre, asocialo.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <Contenido />
      </Suspense>
    </div>
  );
}
