import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

type Filtros = { q?: string; cat?: string; estado?: string; falta?: string };

type Fila = {
  id: string;
  slug: string;
  nombre: string;
  estado: "activo" | "agotado" | "oculto";
  orden: number;
  descripcion: string | null;
  caracteristicas: Record<string, string>;
  categorias: { slug: string; nombre: string } | null;
  imagenes: { url: string; principal: boolean; orden: number }[];
  variantes: { precio: number; activo: boolean }[];
};

const ESTADOS = {
  activo: { texto: "Publicado", clase: "bg-green-100 text-green-800" },
  agotado: { texto: "Agotado", clase: "bg-amber-100 text-amber-800" },
  oculto: { texto: "Oculto", clase: "bg-muted text-muted-foreground" },
} as const;

const FALTAS = [
  { id: "fotos", texto: "Sin fotos" },
  { id: "precio", texto: "Sin precio" },
  { id: "descripcion", texto: "Sin descripción" },
  { id: "caracteristicas", texto: "Sin características" },
] as const;

function faltantes(p: Fila) {
  const f: string[] = [];
  if (!p.imagenes.length) f.push("fotos");
  if (!p.variantes.some((v) => v.activo && Number(v.precio) > 0)) f.push("precio");
  if (!p.descripcion?.trim()) f.push("descripcion");
  if (!Object.keys(p.caracteristicas ?? {}).length) f.push("caracteristicas");
  return f;
}

function enlace(filtros: Filtros, cambio: Partial<Filtros>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...filtros, ...cambio })) if (v) sp.set(k, v);
  const s = sp.toString();
  return `/admin/catalogo${s ? `?${s}` : ""}`;
}

async function Contenido({ searchParams }: { searchParams: Promise<Filtros> }) {
  const filtros = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("productos")
    .select(
      "id, slug, nombre, estado, orden, descripcion, caracteristicas, categorias(slug, nombre), imagenes(url, principal, orden), variantes(precio, activo)"
    )
    .order("orden")
    .order("nombre")
    .limit(1000);
  if (error) throw error;
  // Primero lo que está en la tienda, después lo oculto; dentro de cada grupo, el orden fijado
  const todos = ((data ?? []) as unknown as Fila[]).sort(
    (a, b) => Number(a.estado === "oculto") - Number(b.estado === "oculto") || a.orden - b.orden || a.nombre.localeCompare(b.nombre)
  );

  const q = (filtros.q ?? "").toLowerCase().trim();
  const lista = todos.filter(
    (p) =>
      (!q || p.nombre.toLowerCase().includes(q) || p.slug.includes(q)) &&
      (!filtros.cat || p.categorias?.slug === filtros.cat) &&
      (!filtros.estado || p.estado === filtros.estado) &&
      (!filtros.falta || faltantes(p).includes(filtros.falta))
  );

  const categorias = [...new Map(todos.filter((p) => p.categorias).map((p) => [p.categorias!.slug, p.categorias!.nombre]))];
  const publicados = todos.filter((p) => p.estado !== "oculto");
  const listos = todos.filter((p) => p.estado === "oculto" && faltantes(p).length === 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-sm sm:max-w-xl">
        <Link href={enlace({}, { estado: "activo" })} className="rounded-lg border p-3 hover:bg-muted">
          <span className="block text-2xl font-bold">{publicados.length}</span>en la tienda
        </Link>
        <Link href={enlace({}, { estado: "oculto" })} className="rounded-lg border p-3 hover:bg-muted">
          <span className="block text-2xl font-bold">{todos.length - publicados.length}</span>ocultos
        </Link>
        <div className="rounded-lg border p-3">
          <span className="block text-2xl font-bold">{listos.length}</span>ocultos y listos para publicar
        </div>
      </div>

      <form className="flex flex-wrap items-end gap-2" action="/admin/catalogo">
        <input
          name="q"
          defaultValue={filtros.q}
          placeholder="Buscar por nombre"
          className="h-9 w-56 rounded-md border px-3 text-sm"
          aria-label="Buscar por nombre"
        />
        <select name="cat" defaultValue={filtros.cat ?? ""} className="h-9 rounded-md border px-2 text-sm" aria-label="Categoría">
          <option value="">Todas las categorías</option>
          {categorias.map(([slug, nombre]) => (
            <option key={slug} value={slug}>
              {nombre}
            </option>
          ))}
        </select>
        <select name="estado" defaultValue={filtros.estado ?? ""} className="h-9 rounded-md border px-2 text-sm" aria-label="Estado">
          <option value="">Todos los estados</option>
          <option value="activo">Publicados</option>
          <option value="agotado">Agotados</option>
          <option value="oculto">Ocultos</option>
        </select>
        <select name="falta" defaultValue={filtros.falta ?? ""} className="h-9 rounded-md border px-2 text-sm" aria-label="Le falta">
          <option value="">Completos e incompletos</option>
          {FALTAS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.texto}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" variant="outline">
          Filtrar
        </Button>
        {Object.values(filtros).some(Boolean) ? (
          <Link href="/admin/catalogo" className="text-sm text-muted-foreground underline">
            Quitar filtros
          </Link>
        ) : null}
      </form>

      <p className="text-sm text-muted-foreground">{lista.length} productos</p>

      <ul className="divide-y rounded-lg border">
        {lista.map((p) => {
          const foto = [...p.imagenes].sort((a, b) => Number(b.principal) - Number(a.principal) || a.orden - b.orden)[0];
          const f = faltantes(p);
          const conPrecio = p.variantes.filter((v) => v.activo && Number(v.precio) > 0).length;
          return (
            <li key={p.id}>
              <Link href={`/admin/catalogo/${p.id}`} className="flex items-center gap-3 p-3 hover:bg-muted/50">
                <span className="relative size-12 shrink-0 overflow-hidden rounded-md border bg-white">
                  {foto ? <Image src={foto.url} alt="" fill sizes="48px" className="object-contain" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{p.nombre}</span>
                  <span className="block text-xs text-muted-foreground">
                    {p.categorias?.nombre ?? "Sin categoría"} · {conPrecio}/{p.variantes.length} con precio · {p.imagenes.length} fotos
                  </span>
                  {f.length ? (
                    <span className="mt-1 flex flex-wrap gap-1">
                      {f.map((x) => (
                        <Badge key={x} variant="outline" className="text-[11px] font-normal">
                          {FALTAS.find((y) => y.id === x)?.texto}
                        </Badge>
                      ))}
                    </span>
                  ) : null}
                </span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${ESTADOS[p.estado].clase}`}>
                  {ESTADOS[p.estado].texto}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function Catalogo(props: PageProps<"/admin/catalogo">) {
  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Catálogo</h1>
        <p className="text-sm text-muted-foreground">
          Fotos, textos y características de cada producto. Un producto aparece en la tienda cuando está publicado y tiene
          foto y precio.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <Contenido searchParams={props.searchParams as Promise<Filtros>} />
      </Suspense>
    </div>
  );
}
