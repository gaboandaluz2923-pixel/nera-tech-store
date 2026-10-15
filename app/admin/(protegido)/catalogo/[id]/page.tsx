import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowDown, ArrowUp, ExternalLink, Star, Trash2 } from "lucide-react";
import { Editable, FilaEditable } from "@/components/admin/editable";
import { BotonGuardar, FormularioAccion } from "@/components/admin/formulario-accion";
import { ListaHistorial, type Entrada } from "@/components/admin/lista-historial";
import { Dato, Datos, Lineas } from "@/components/admin/vista";
import { SubirFotos } from "@/components/admin/subir-fotos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { describir, nombresEquipo, quien, type FilaHistorial } from "@/lib/admin/historial";
import { EJEMPLOS, PLANTILLAS } from "@/lib/admin/plantillas";
import { rolActual } from "@/lib/admin/sesion";
import { createClient } from "@/lib/supabase/server";
import { NOMBRE_CARACTERISTICA } from "@/lib/tienda/formato";
import {
  cambiarEstado,
  cambiarFoto,
  crearOpenBox,
  guardarCondicion,
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
  condicion: "nuevo" | "open_box" | "usado";
  producto_base_id: string | null;
  condicion_detalle: string | null;
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
    disponibilidad_manual: "auto" | "bajo_pedido" | "agotado";
  }[];
  coleccion_producto: { coleccion_id: string }[];
};

const DISPONIBILIDAD_MANUAL = {
  auto: "Según la lista del proveedor",
  bajo_pedido: "Bajo pedido (48 h)",
  agotado: "Agotado",
} as const;

const ESTADO_PRODUCTO = { activo: "Publicado", agotado: "Publicado como agotado", oculto: "Oculto" } as const;

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
  const [{ data, error }, { data: categorias }, { data: colecciones }, { rol }, historial, nombres] = await Promise.all([
    supabase
      .from("productos")
      .select(
        `id, slug, nombre, marca, categoria_id, resumen, descripcion, caracteristicas, incluye, faq, estado, orden,
         condicion, producto_base_id, condicion_detalle,
         meta_titulo, meta_descripcion, publicado_en, categorias(slug, nombre),
         imagenes(id, url, alt, orden, principal),
         variantes(id, nombre, color, ram_gb, almacenamiento_gb, stock, precio, activo, disponibilidad_manual),
         coleccion_producto(coleccion_id)`
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("categorias").select("id, slug, nombre").order("orden"),
    supabase.from("colecciones").select("id, slug, nombre").order("orden"),
    rolActual(),
    supabase
      .from("historial")
      .select("id, tabla, registro_id, accion, campos, antes, despues, usuario, created_at")
      .eq("producto_id", id)
      .order("created_at", { ascending: false })
      .limit(40)
      .then((r) => (r.error ? [] : ((r.data ?? []) as FilaHistorial[]))),
    nombresEquipo(supabase),
  ]);
  if (error) throw error;
  if (!data) notFound();
  const p = data as unknown as Producto;
  // Open Box / usado: su modelo nuevo; producto nuevo: sus fichas Open Box
  const [{ data: relacionadosOB }, { data: nuevos }] = await Promise.all([
    p.condicion === "nuevo"
      ? supabase.from("productos").select("id, nombre, condicion, estado").eq("producto_base_id", p.id)
      : supabase.from("productos").select("id, nombre, condicion, estado").eq("id", p.producto_base_id ?? "00000000-0000-0000-0000-000000000000"),
    p.condicion === "nuevo"
      ? Promise.resolve({ data: [] as { id: string; nombre: string }[] })
      : supabase.from("productos").select("id, nombre").eq("condicion", "nuevo").order("nombre").limit(1000),
  ]);
  const base = p.condicion === "nuevo" ? null : (relacionadosOB?.[0] ?? null);
  const esAdmin = rol === "super_admin";

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
  const conValor = claves.filter((k) => p.caracteristicas?.[k]);
  const faq = [...p.faq, { pregunta: "", respuesta: "" }, { pregunta: "", respuesta: "" }];
  const enColeccion = new Set(p.coleccion_producto.map((c) => c.coleccion_id));
  const faltas = [
    !fotos.length && !base && "una foto",
    !variantes.some((v) => v.activo && Number(v.precio) > 0) && "precio de venta",
    !p.categoria_id && "categoría",
  ].filter(Boolean);
  const nombreVariante = new Map(variantes.map((v) => [v.id, v.nombre]));
  const entradas: Entrada[] = historial.map((h) => ({
    id: h.id,
    cuando: h.created_at,
    quien: quien(h.usuario, nombres),
    que: describir(h, nombreVariante.get(h.registro_id) ?? (h.antes?.nombre as string | undefined)),
  }));

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
      <Editable
        titulo="Publicación"
        accion={cambiarEstado}
        textoEditar="Cambiar"
        vista={
          <div className="space-y-1 text-sm">
            <p className="text-base font-medium">{ESTADO_PRODUCTO[p.estado]}</p>
            <p className="text-muted-foreground">
              {faltas.length
                ? `Para que se vea en la tienda falta: ${faltas.join(", ")}.`
                : p.estado === "oculto"
                  ? "Tiene lo necesario para publicarse."
                  : "Se ve en la tienda."}
            </p>
          </div>
        }
      >
        <input type="hidden" name="id" value={p.id} />
        <div className="space-y-1">
          <Label htmlFor="estado">Estado</Label>
          <select id="estado" name="estado" defaultValue={p.estado} className="h-9 rounded-md border px-2 text-sm">
            <option value="activo">Publicado</option>
            <option value="agotado">Publicado como agotado</option>
            <option value="oculto">Oculto</option>
          </select>
        </div>
      </Editable>

      {/* Open Box / usado */}
      {p.condicion === "nuevo" ? (
        <Editable
          titulo="Open Box o usado"
          descripcion="Una unidad con la caja abierta (o usada) va en su propia ficha, en la categoría Open Box, enlazada a este modelo."
          accion={crearOpenBox}
          textoEditar="+ Crear ficha Open Box"
          textoGuardar="Crear"
          vista={
            relacionadosOB?.length ? (
              <ul className="space-y-1 text-sm">
                {relacionadosOB.map((r) => (
                  <li key={r.id}>
                    <Link href={`/admin/catalogo/${r.id}`} className="font-medium text-primary underline">
                      {r.nombre}
                    </Link>{" "}
                    <span className="text-muted-foreground">· {ESTADO_PRODUCTO[r.estado as Producto["estado"]] ?? r.estado}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Este modelo no tiene fichas Open Box ni usadas.</p>
            )
          }
        >
          <input type="hidden" name="id" value={p.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="ob-variante">Memoria y color de la unidad</Label>
              <select id="ob-variante" name="varianteId" required className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                {variantes.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="ob-condicion">Condición</Label>
              <select id="ob-condicion" name="condicion" defaultValue="open_box" className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                <option value="open_box">Open Box (caja abierta, no sellado)</option>
                <option value="usado">Usado</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ob-detalle">Cómo viene (lo ve el cliente)</Label>
            <Textarea
              id="ob-detalle"
              name="condicion_detalle"
              rows={2}
              placeholder="Sin uso, caja abierta para revisión. Trae cargador y cable. Pantalla y cuerpo sin rayones."
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Se crea oculta, con las características de este modelo y sin precio. Si no le subís fotos, usa las de este modelo.
          </p>
        </Editable>
      ) : (
        <Editable
          titulo={p.condicion === "open_box" ? "Condición: Open Box" : "Condición: usado"}
          accion={guardarCondicion}
          vista={
            <Datos>
              <Dato etiqueta="Condición">{p.condicion === "open_box" ? "Open Box (caja abierta, no sellado de fábrica)" : "Usado"}</Dato>
              <Dato etiqueta="Cómo viene">{p.condicion_detalle || "—"}</Dato>
              <Dato etiqueta="Modelo nuevo">
                {base ? (
                  <Link href={`/admin/catalogo/${base.id}`} className="text-primary underline">
                    {base.nombre}
                  </Link>
                ) : (
                  "—"
                )}
              </Dato>
            </Datos>
          }
        >
          <input type="hidden" name="id" value={p.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="c-condicion">Condición</Label>
              <select id="c-condicion" name="condicion" defaultValue={p.condicion} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                <option value="open_box">Open Box (caja abierta, no sellado)</option>
                <option value="usado">Usado</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="c-base">Modelo nuevo</Label>
              <select
                id="c-base"
                name="producto_base_id"
                defaultValue={p.producto_base_id ?? ""}
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              >
                <option value="">— Ninguno —</option>
                {(nuevos ?? []).map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="c-detalle">Cómo viene (lo ve el cliente)</Label>
            <Textarea id="c-detalle" name="condicion_detalle" rows={3} defaultValue={p.condicion_detalle ?? ""} />
          </div>
        </Editable>
      )}

      {/* Fotos: cada botón actúa al instante */}
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
          {/* Sin "pegar dirección": la tienda solo muestra fotos guardadas en el sistema (una foto enlazada de otro sitio sale rota) */}
        </CardContent>
      </Card>

      {/* Datos */}
      <Editable
        titulo="Datos y textos"
        accion={guardarDatos}
        vista={
          <Datos>
            <Dato etiqueta="Nombre en la tienda">{p.nombre}</Dato>
            <Dato etiqueta="Marca">{p.marca}</Dato>
            <Dato etiqueta="Categoría">{p.categorias?.nombre}</Dato>
            <Dato etiqueta="Orden">{String(p.orden)}</Dato>
            <Dato etiqueta="Resumen" ancho>
              {p.resumen}
            </Dato>
            <Dato etiqueta="Descripción" ancho>
              {p.descripcion}
            </Dato>
            <Dato etiqueta="Qué trae la caja" ancho>
              <Lineas items={p.incluye?.split("\n").filter(Boolean)} />
            </Dato>
            <Dato etiqueta="Dirección de la página">{`/producto/${p.slug}`}</Dato>
            <Dato etiqueta="Título para Google">{p.meta_titulo || `${p.nombre} precio en El Salvador (automático)`}</Dato>
            <Dato etiqueta="Descripción para Google" ancho>
              {p.meta_descripcion || "Automática"}
            </Dato>
          </Datos>
        }
      >
        <input type="hidden" name="id" value={p.id} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo nombre="nombre" etiqueta="Nombre en la tienda" valor={p.nombre} />
          <Campo nombre="marca" etiqueta="Marca" valor={p.marca} />
          <div className="space-y-1">
            <Label htmlFor="categoria_id">Categoría</Label>
            <select id="categoria_id" name="categoria_id" defaultValue={p.categoria_id ?? ""} className="h-9 w-full rounded-md border px-2 text-sm">
              <option value="">Sin categoría</option>
              {(categorias ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <Campo nombre="orden" etiqueta="Orden" valor={p.orden} ayuda="Número menor = aparece primero en las listas." />
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
        <Campo nombre="incluye" etiqueta="Qué trae la caja (una cosa por línea)" valor={p.incluye} largo filas={4} />
        <details className="rounded-md border p-3">
          <summary className="cursor-pointer text-sm font-medium">Google y dirección de la página (opcional)</summary>
          <div className="mt-3 space-y-3">
            <Campo
              nombre="slug"
              etiqueta="Dirección"
              valor={p.slug}
              ayuda={`La página queda en /producto/${p.slug}. Si la cambiás después de publicar, los enlaces viejos dejan de funcionar.`}
            />
            <Campo nombre="meta_titulo" etiqueta="Título para Google" valor={p.meta_titulo} ayuda={`Si lo dejás vacío se usa "${p.nombre} precio en El Salvador".`} />
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
      </Editable>

      {/* Características */}
      <Editable
        titulo="Características"
        accion={guardarCaracteristicas}
        vista={
          conValor.length ? (
            <Datos>
              {conValor.map((k) => (
                <Dato key={k} etiqueta={NOMBRE_CARACTERISTICA[k] ?? k.replace(/_/g, " ")}>
                  {p.caracteristicas[k]}
                </Dato>
              ))}
            </Datos>
          ) : (
            <p className="text-sm text-muted-foreground">Todavía no tiene características.</p>
          )
        }
      >
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
      </Editable>

      {/* Variantes */}
      <Card>
        <CardHeader>
          <CardTitle>Variantes (memoria y color)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {esAdmin ? (
              <>
                El precio se cambia en{" "}
                <Link href={`/admin/precios?q=${encodeURIComponent(p.nombre)}`} className="text-primary underline">
                  Precios
                </Link>{" "}
                (guarda el historial). Aquí: color, unidades propias en bodega, disponibilidad y si se muestra. Las
                compras al proveedor se registran en{" "}
                <Link href="/admin/inventario" className="text-primary underline">
                  Inventario
                </Link>
                .
              </>
            ) : (
              "Aquí cambiás el color, las unidades propias en bodega (después de contarlas), la disponibilidad y si se muestra. El precio lo pone un administrador."
            )}
          </p>
          {variantes.map((v) => (
            <FilaEditable
              key={v.id}
              accion={guardarVariante}
              vista={
                <div className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[1.4fr_1fr_1fr_1.3fr_1fr]">
                  <p className="font-medium">{v.nombre}</p>
                  <p>
                    <span className="text-muted-foreground">Precio </span>
                    {usd(Number(v.precio))}
                  </p>
                  <p>
                    <span className="text-muted-foreground">En bodega </span>
                    {v.stock}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Sin bodega </span>
                    {DISPONIBILIDAD_MANUAL[v.disponibilidad_manual]}
                  </p>
                  <p className={v.activo ? "" : "text-muted-foreground"}>{v.activo ? "Se muestra" : "No se muestra"}</p>
                </div>
              }
            >
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="varianteId" value={v.id} />
              <p className="text-sm font-medium">
                {v.nombre} <span className="font-normal text-muted-foreground">· Precio {usd(Number(v.precio))}</span>
              </p>
              <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-3">
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
                <div className="space-y-1">
                  <Label htmlFor={`disp-${v.id}`} className="text-xs">
                    Si no hay en bodega
                  </Label>
                  <select
                    id={`disp-${v.id}`}
                    name="disponibilidad_manual"
                    defaultValue={v.disponibilidad_manual}
                    className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                  >
                    {Object.entries(DISPONIBILIDAD_MANUAL).map(([valor, texto]) => (
                      <option key={valor} value={valor}>
                        {texto}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex h-9 items-center gap-2 text-sm">
                  <input type="checkbox" name="activo" defaultChecked={v.activo} className="size-4 accent-[var(--marca)]" />
                  Mostrar
                </label>
              </div>
              <div className="space-y-1">
                <Label htmlFor={`nota-${v.id}`} className="text-xs">
                  Si cambiaste las unidades en bodega: ¿por qué? (conteo, dañado, regalo…)
                </Label>
                <Input id={`nota-${v.id}`} name="nota" placeholder="Conteo de bodega" />
                <p className="text-xs text-muted-foreground">
                  Las compras al proveedor y las ventas mueven el stock solas; aquí solo se corrige después de contar.
                </p>
              </div>
            </FilaEditable>
          ))}
        </CardContent>
      </Card>

      {/* Preguntas frecuentes */}
      <Editable
        titulo="Preguntas frecuentes"
        accion={guardarFaq}
        vista={
          p.faq.length ? (
            <dl className="space-y-3 text-sm">
              {p.faq.map((f, i) => (
                <div key={i}>
                  <dt className="font-medium">{f.pregunta}</dt>
                  <dd className="text-muted-foreground">{f.respuesta}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">Sin preguntas propias. “¿Puedo pagar al recibir?” y {p.condicion === "nuevo" ? "“¿Es nuevo y original?”" : "“¿Qué significa Open Box?”"} se agregan solas.</p>
          )
        }
      >
        <input type="hidden" name="id" value={p.id} />
        <p className="text-sm text-muted-foreground">
          Respondé aquí lo que más te preguntan por WhatsApp de este producto. Para quitar una pregunta, borrá sus dos campos.
          “¿Puedo pagar al recibir?” y {p.condicion === "nuevo" ? "“¿Es nuevo y original?”" : "“¿Qué significa Open Box?”"} ya se agregan solas.
        </p>
        {faq.map((f, i) => (
          <div key={i} className="grid gap-2 rounded-md border p-3">
            <Input name={`pregunta_${i}`} defaultValue={f.pregunta} placeholder={`Pregunta ${i + 1}`} aria-label={`Pregunta ${i + 1}`} />
            <Textarea name={`respuesta_${i}`} defaultValue={f.respuesta} rows={2} placeholder="Respuesta" aria-label={`Respuesta ${i + 1}`} />
          </div>
        ))}
      </Editable>

      {/* Colecciones */}
      <Editable
        titulo="Colecciones"
        accion={guardarColecciones}
        vista={
          <p className="text-sm">
            {(colecciones ?? []).filter((c) => enColeccion.has(c.id)).map((c) => c.nombre).join(", ") || (
              <span className="text-muted-foreground">En ninguna colección.</span>
            )}
          </p>
        }
      >
        <input type="hidden" name="id" value={p.id} />
        <div className="flex flex-wrap gap-4">
          {(colecciones ?? []).map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="coleccion" value={c.id} defaultChecked={enColeccion.has(c.id)} className="size-4 accent-[var(--marca)]" />
              {c.nombre}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">“Los más pedidos” y “Recién llegado” aparecen en la página de inicio con su etiqueta.</p>
      </Editable>

      {/* Historial */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de cambios</CardTitle>
        </CardHeader>
        <CardContent>
          <ListaHistorial entradas={entradas} />
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
