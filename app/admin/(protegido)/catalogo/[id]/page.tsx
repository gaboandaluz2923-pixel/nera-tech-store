import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowDown, ArrowUp, ExternalLink, Star, Trash2 } from "lucide-react";
import { BotonGuardar, FormularioAccion } from "@/components/admin/formulario-accion";
import { SubirFotos } from "@/components/admin/subir-fotos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EJEMPLOS, PLANTILLAS } from "@/lib/admin/plantillas";
import { createClient } from "@/lib/supabase/server";
import { NOMBRE_CARACTERISTICA } from "@/lib/tienda/formato";
import {
  agregarFotoUrl,
  cambiarEstado,
  cambiarFoto,
  guardarCaracteristicas,
  guardarColecciones,
  guardarDatos,
  guardarFaq,
  guardarVariante,
  subirFoto,
} from "../actions";

type Producto = {
  id: string;
  slug: string;
  nombre: string;
  marca: string | null;
  categoria_id: string | null;
  resumen: string | null;
  descripcion: string | null;
  caracteristicas: Record<string, string>;
  incluye: string | null;
  faq: { pregunta: string; respuesta: string }[];
  estado: "activo" | "agotado" | "oculto";
  orden: number;
  meta_titulo: string | null;
  meta_descripcion: string | null;
  publicado_en: string | null;
  categorias: { slug: string; nombre: string } | null;
  imagenes: { id: string; url: string; alt: string | null; orden: number; principal: boolean }[];
  variantes: {
    id: string;
    nombre: string;
    color: string | null;
    ram_gb: number | null;
    almacenamiento_gb: number | null;
    stock: number;
    precio: number;
    activo: boolean;
  }[];
  coleccion_producto: { coleccion_id: string }[];
};

const usd = (n: number) => (n > 0 ? n.toLocaleString("en-US", { style: "currency", currency: "USD" }) : "—");

function Campo({
  nombre,
  etiqueta,
  valor,
  ayuda,
  largo,
  filas = 3,
  placeholder,
}: {
  nombre: string;
  etiqueta: string;
  valor: string | number | null;
  ayuda?: string;
  largo?: boolean;
  filas?: number;
  placeholder?: string;
}) {
  const id = `campo-${nombre}`;
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{etiqueta}</Label>
      {largo ? (
        <Textarea id={id} name={nombre} defaultValue={valor ?? ""} rows={filas} placeholder={placeholder} />
      ) : (
        <Input id={id} name={nombre} defaultValue={valor ?? ""} placeholder={placeholder} />
      )}
      {ayuda ? <p className="text-xs text-muted-foreground">{ayuda}</p> : null}
    </div>
  );
}

async function Editor({ params }: { params: PageProps<"/admin/catalogo/[id]">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const [{ data, error }, { data: categorias }, { data: colecciones }] = await Promise.all([
    supabase
      .from("productos")
      .select(
        `id, slug, nombre, marca, categoria_id, resumen, descripcion, caracteristicas, incluye, faq, estado, orden,
         meta_titulo, meta_descripcion, publicado_en, categorias(slug, nombre),
         imagenes(id, url, alt, orden, principal),
         variantes(id, nombre, color, ram_gb, almacenamiento_gb, stock, precio, activo),
         coleccion_producto(coleccion_id)`
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("categorias").select("id, slug, nombre").order("orden"),
    supabase.from("colecciones").select("id, slug, nombre").order("orden"),
  ]);
  if (error) throw error;
  if (!data) notFound();
  const p = data as unknown as Producto;

  const fotos = [...p.imagenes].sort((a, b) => a.orden - b.orden);
  const variantes = [...p.variantes].sort(
    (a, b) =>
      (a.almacenamiento_gb ?? 0) - (b.almacenamiento_gb ?? 0) ||
      (a.ram_gb ?? 0) - (b.ram_gb ?? 0) ||
      (a.color ?? "").localeCompare(b.color ?? "")
  );
  const plantilla = PLANTILLAS[p.categorias?.slug ?? "otros"] ?? [];
  const extras = Object.keys(p.caracteristicas ?? {}).filter((k) => !plantilla.includes(k));
  const claves = [...plantilla, ...extras];
  const faq = [...p.faq, { pregunta: "", respuesta: "" }, { pregunta: "", respuesta: "" }];
  const enColeccion = new Set(p.coleccion_producto.map((c) => c.coleccion_id));
  const faltas = [
    !fotos.length && "una foto",
    !variantes.some((v) => v.activo && Number(v.precio) > 0) && "precio de venta",
    !p.categoria_id && "categoría",
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/catalogo" className="text-sm text-muted-foreground hover:underline">
            ← Catálogo
          </Link>
          <h1 className="text-xl font-semibold">{p.nombre}</h1>
        </div>
        {p.estado !== "oculto" ? (
          <a
            href={`/producto/${p.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Ver en la tienda <ExternalLink className="size-4" />
          </a>
        ) : null}
      </div>

      {/* Publicación */}
      <Card>
        <CardHeader>
          <CardTitle>Publicación</CardTitle>
        </CardHeader>
        <CardContent>
          <FormularioAccion key={p.estado} accion={cambiarEstado} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={p.id} />
            <div className="space-y-1">
              <Label htmlFor="estado">Estado</Label>
              <select id="estado" name="estado" defaultValue={p.estado} className="h-9 rounded-md border px-2 text-sm">
                <option value="activo">Publicado</option>
                <option value="agotado">Publicado como agotado</option>
                <option value="oculto">Oculto</option>
              </select>
            </div>
            <BotonGuardar>Cambiar</BotonGuardar>
            <p className="basis-full text-sm text-muted-foreground">
              {faltas.length
                ? `Para que se vea en la tienda falta: ${faltas.join(", ")}.`
                : p.estado === "oculto"
                  ? "Tiene lo necesario para publicarse."
                  : "Se ve en la tienda."}
            </p>
          </FormularioAccion>
        </CardContent>
      </Card>

      {/* Fotos */}
      <Card>
        <CardHeader>
          <CardTitle>Fotos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {fotos.length ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {fotos.map((f, i) => (
                <li key={f.id} className="space-y-2 rounded-lg border p-2">
                  <div className="relative aspect-square overflow-hidden rounded bg-white">
                    <Image src={f.url} alt={f.alt ?? ""} fill sizes="200px" className="object-contain" />
                    {f.principal ? (
                      <span className="absolute top-1 left-1 rounded bg-marca px-1.5 py-0.5 text-[11px] font-semibold text-white">
                        Principal
                      </span>
                    ) : null}
                  </div>
                  <FormularioAccion accion={cambiarFoto} className="flex flex-wrap gap-1">
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="imagenId" value={f.id} />
                    <BotonGuardar variant="outline" size="icon-sm" name="accion" value="subir" etiqueta="Mover antes">
                      <ArrowUp className="size-4" aria-hidden />
                    </BotonGuardar>
                    <BotonGuardar variant="outline" size="icon-sm" name="accion" value="bajar" etiqueta="Mover después">
                      <ArrowDown className="size-4" aria-hidden />
                    </BotonGuardar>
                    {!f.principal ? (
                      <BotonGuardar variant="outline" size="icon-sm" name="accion" value="principal" etiqueta="Hacer principal">
                        <Star className="size-4" aria-hidden />
                      </BotonGuardar>
                    ) : null}
                    <BotonGuardar variant="outline" size="icon-sm" name="accion" value="quitar" etiqueta="Quitar foto" className="ml-auto">
                      <Trash2 className="size-4 text-destructive" aria-hidden />
                    </BotonGuardar>
                  </FormularioAccion>
                  <p className="text-[11px] text-muted-foreground">Foto {i + 1}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Todavía no tiene fotos.</p>
          )}
          <SubirFotos productoId={p.id} subir={subirFoto} />
          <FormularioAccion accion={agregarFotoUrl} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="id" value={p.id} />
            <div className="min-w-64 flex-1 space-y-1">
              <Label htmlFor="url-foto">O pegá la dirección de una foto</Label>
              <Input id="url-foto" name="url" placeholder="https://…" />
            </div>
            <BotonGuardar variant="outline">Agregar</BotonGuardar>
          </FormularioAccion>
        </CardContent>
      </Card>

      {/* Datos */}
      <Card>
        <CardHeader>
          <CardTitle>Datos y textos</CardTitle>
        </CardHeader>
        <CardContent>
          <FormularioAccion key={`${p.categoria_id}-${p.slug}`} accion={guardarDatos} className="space-y-4">
            <input type="hidden" name="id" value={p.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo nombre="nombre" etiqueta="Nombre en la tienda" valor={p.nombre} />
              <Campo nombre="marca" etiqueta="Marca" valor={p.marca} />
              <div className="space-y-1">
                <Label htmlFor="categoria_id">Categoría</Label>
                <select
                  id="categoria_id"
                  name="categoria_id"
                  defaultValue={p.categoria_id ?? ""}
                  className="h-9 w-full rounded-md border px-2 text-sm"
                >
                  <option value="">Sin categoría</option>
                  {(categorias ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <Campo
                nombre="orden"
                etiqueta="Orden"
                valor={p.orden}
                ayuda="Número menor = aparece primero en las listas."
              />
            </div>
            <Campo
              nombre="resumen"
              etiqueta="Resumen (una línea bajo el nombre)"
              valor={p.resumen}
              placeholder='Ej. "5G, pantalla AMOLED de 120 Hz y cámara de 50 MP"'
            />
            <Campo
              nombre="descripcion"
              etiqueta="Descripción: cómo le ayuda al cliente"
              valor={p.descripcion}
              largo
              filas={7}
              ayuda="Separá los párrafos con una línea en blanco. Hablá de beneficios (le dura el día, fotos nítidas), no solo de números."
            />
            <Campo
              nombre="incluye"
              etiqueta="Qué trae la caja (una cosa por línea)"
              valor={p.incluye}
              largo
              filas={4}
            />
            <details className="rounded-md border p-3">
              <summary className="cursor-pointer text-sm font-medium">Google y dirección de la página (opcional)</summary>
              <div className="mt-3 space-y-3">
                <Campo
                  nombre="slug"
                  etiqueta="Dirección"
                  valor={p.slug}
                  ayuda={`La página queda en /producto/${p.slug}. Si la cambiás después de publicar, los enlaces viejos dejan de funcionar.`}
                />
                <Campo
                  nombre="meta_titulo"
                  etiqueta="Título para Google"
                  valor={p.meta_titulo}
                  ayuda={`Si lo dejás vacío se usa "${p.nombre} precio en El Salvador".`}
                />
                <Campo
                  nombre="meta_descripcion"
                  etiqueta="Descripción para Google"
                  valor={p.meta_descripcion}
                  largo
                  filas={2}
                  ayuda="Unas 150 letras. Se arma sola si la dejás vacía."
                />
              </div>
            </details>
            <BotonGuardar />
          </FormularioAccion>
        </CardContent>
      </Card>

      {/* Características */}
      <Card>
        <CardHeader>
          <CardTitle>Características</CardTitle>
        </CardHeader>
        <CardContent>
          <FormularioAccion key={JSON.stringify(p.caracteristicas)} accion={guardarCaracteristicas} className="space-y-4">
            <input type="hidden" name="id" value={p.id} />
            {claves.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {claves.map((k) => (
                  <div key={k} className="space-y-1">
                    <Label htmlFor={`c-${k}`}>{NOMBRE_CARACTERISTICA[k] ?? k.replace(/_/g, " ")}</Label>
                    <Input id={`c-${k}`} name={`c_${k}`} defaultValue={p.caracteristicas?.[k] ?? ""} placeholder={EJEMPLOS[k]} />
                  </div>
                ))}
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo nombre="nueva_clave" etiqueta="Otra característica (nombre)" valor="" placeholder="Ej. Lector de huella" />
              <Campo nombre="nuevo_valor" etiqueta="Valor" valor="" placeholder="Ej. En el botón lateral" />
            </div>
            <p className="text-xs text-muted-foreground">
              Dejá vacío lo que no aplique: no se muestra. La memoria (RAM y almacenamiento) va en cada variante.
            </p>
            <BotonGuardar />
          </FormularioAccion>
        </CardContent>
      </Card>

      {/* Variantes */}
      <Card>
        <CardHeader>
          <CardTitle>Variantes (memoria y color)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            El precio se cambia en{" "}
            <Link href={`/admin/precios?q=${encodeURIComponent(p.nombre)}`} className="text-primary underline">
              Precios
            </Link>{" "}
            (guarda el historial). Aquí: color, unidades propias en bodega y si se muestra.
          </p>
          {variantes.map((v) => (
            <FormularioAccion key={`${v.id}-${v.color}-${v.stock}-${v.activo}`} accion={guardarVariante} className="grid grid-cols-2 items-end gap-2 rounded-md border p-3 sm:grid-cols-[1.4fr_1fr_0.6fr_0.6fr_auto_auto]">
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="varianteId" value={v.id} />
              <div className="col-span-2 sm:col-span-1">
                <p className="text-sm font-medium">{v.nombre}</p>
                <p className="text-xs text-muted-foreground">Precio: {usd(Number(v.precio))}</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor={`color-${v.id}`} className="text-xs">
                  Color
                </Label>
                <Input id={`color-${v.id}`} name="color" defaultValue={v.color ?? ""} />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`stock-${v.id}`} className="text-xs">
                  En bodega
                </Label>
                <Input id={`stock-${v.id}`} name="stock" type="number" min="0" defaultValue={v.stock} />
              </div>
              <label className="flex h-9 items-center gap-2 text-sm">
                <input type="checkbox" name="activo" defaultChecked={v.activo} className="size-4 accent-[var(--marca)]" />
                Mostrar
              </label>
              <span />
              <BotonGuardar size="sm" variant="outline">
                Guardar
              </BotonGuardar>
            </FormularioAccion>
          ))}
        </CardContent>
      </Card>

      {/* Preguntas frecuentes */}
      <Card>
        <CardHeader>
          <CardTitle>Preguntas frecuentes</CardTitle>
        </CardHeader>
        <CardContent>
          <FormularioAccion key={JSON.stringify(p.faq).length + "-" + p.faq.length} accion={guardarFaq} className="space-y-4">
            <input type="hidden" name="id" value={p.id} />
            <p className="text-sm text-muted-foreground">
              Respondé aquí lo que más te preguntan por WhatsApp de este producto. Para quitar una pregunta, borrá sus dos
              campos. “¿Puedo pagar al recibir?” y “¿Es nuevo y original?” ya se agregan solas.
            </p>
            {faq.map((f, i) => (
              <div key={i} className="grid gap-2 rounded-md border p-3">
                <Input name={`pregunta_${i}`} defaultValue={f.pregunta} placeholder={`Pregunta ${i + 1}`} aria-label={`Pregunta ${i + 1}`} />
                <Textarea name={`respuesta_${i}`} defaultValue={f.respuesta} rows={2} placeholder="Respuesta" aria-label={`Respuesta ${i + 1}`} />
              </div>
            ))}
            <BotonGuardar />
          </FormularioAccion>
        </CardContent>
      </Card>

      {/* Colecciones */}
      <Card>
        <CardHeader>
          <CardTitle>Colecciones</CardTitle>
        </CardHeader>
        <CardContent>
          <FormularioAccion key={[...enColeccion].sort().join()} accion={guardarColecciones} className="space-y-3">
            <input type="hidden" name="id" value={p.id} />
            <div className="flex flex-wrap gap-4">
              {(colecciones ?? []).map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="coleccion"
                    value={c.id}
                    defaultChecked={enColeccion.has(c.id)}
                    className="size-4 accent-[var(--marca)]"
                  />
                  {c.nombre}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              “Los más pedidos” y “Recién llegado” aparecen en la página de inicio con su etiqueta.
            </p>
            <BotonGuardar />
          </FormularioAccion>
        </CardContent>
      </Card>
    </div>
  );
}

export default function EditarProducto({ params }: PageProps<"/admin/catalogo/[id]">) {
  return (
    <div className="max-w-4xl">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <Editor params={params} />
      </Suspense>
    </div>
  );
}
