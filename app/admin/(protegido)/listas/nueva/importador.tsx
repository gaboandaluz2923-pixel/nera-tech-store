"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  detectarColumnas,
  extraerLineas,
  leerTexto,
  type Mapeo,
  type Tabla,
} from "@/lib/listas/columnas";
import { interpretar } from "@/lib/listas/normalizar";
import { importarLista, type ResultadoImportacion } from "../actions";

type Proveedor = { id: string; nombre: string };

const POR_PAGINA = 50;

const selectClase =
  "h-9 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

async function leerArchivo(archivo: File): Promise<Tabla> {
  const nombre = archivo.name.toLowerCase();
  if (nombre.endsWith(".xlsx") || nombre.endsWith(".xls")) {
    const { readSheet } = await import("read-excel-file/browser");
    const filas = await readSheet(archivo);
    return filas
      .map((f) => f.map((c) => (c === null || c === undefined ? "" : String(c).trim())))
      .filter((f) => f.some(Boolean));
  }
  if (nombre.endsWith(".pdf")) {
    throw new Error(
      "Los PDF no se pueden leer directo. Pedile al proveedor el Excel, o abrí el PDF, copiá la tabla y pegala abajo."
    );
  }
  return leerTexto(await archivo.text());
}

export function Importador({ proveedores, hoy }: { proveedores: Proveedor[]; hoy: string }) {
  const [proveedorId, setProveedorId] = useState("");
  const [fecha, setFecha] = useState(hoy);
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const [tabla, setTabla] = useState<Tabla | null>(null);
  const [mapeo, setMapeo] = useState<Mapeo | null>(null);
  const [pegado, setPegado] = useState("");
  // Lo pegado se ve completo solo mientras se edita; leído, queda en una línea con "Editar"
  const [editandoPegado, setEditandoPegado] = useState(true);
  const [enfocado, setEnfocado] = useState(false);
  const [pagina, setPagina] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const [pendiente, iniciar] = useTransition();

  function cargar(t: Tabla, nombre: string | null) {
    if (t.length < 2) {
      setError("No encontré filas en la lista.");
      return;
    }
    setError(null);
    setResultado(null);
    setTabla(t);
    setMapeo(detectarColumnas(t));
    setPagina(0);
    setNombreArchivo(nombre);
  }

  async function alElegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    try {
      cargar(await leerArchivo(archivo), archivo.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pude leer el archivo.");
    }
  }

  const lineas = useMemo(() => (tabla && mapeo ? extraerLineas(tabla, mapeo) : []), [tabla, mapeo]);
  const paginas = Math.max(1, Math.ceil(lineas.length / POR_PAGINA));
  const actual = Math.min(pagina, paginas - 1);
  const desde = actual * POR_PAGINA;
  const visibles = lineas.slice(desde, desde + POR_PAGINA);
  const columnas = useMemo(() => {
    if (!tabla) return [];
    const ancho = Math.max(...tabla.map((f) => f.length));
    const enc = mapeo && mapeo.filaEncabezado >= 0 ? tabla[mapeo.filaEncabezado] : [];
    return Array.from({ length: ancho }, (_, i) => ({
      i,
      nombre: `${String.fromCharCode(65 + i)}${enc[i] ? ` · ${enc[i].slice(0, 24)}` : ""}`,
    }));
  }, [tabla, mapeo]);

  function campo(nombre: keyof Omit<Mapeo, "filaEncabezado">, etiqueta: string, opcional: boolean) {
    if (!mapeo) return null;
    const valor = mapeo[nombre] ?? null;
    return (
      <div className="space-y-1">
        <Label>{etiqueta}</Label>
        <select
          className={selectClase}
          value={valor === null ? "" : String(valor)}
          onChange={(e) => {
            setMapeo({ ...mapeo, [nombre]: e.target.value === "" ? null : Number(e.target.value) });
            setPagina(0);
          }}
        >
          {opcional ? <option value="">— No trae —</option> : null}
          {columnas.map((c) => (
            <option key={c.i} value={c.i}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>
    );
  }

  function importar() {
    if (!proveedorId) {
      setError("Elegí el proveedor.");
      return;
    }
    if (!mapeo || lineas.length === 0) return;
    setError(null);
    iniciar(async () => {
      const r = await importarLista({ proveedorId, fecha, nombreArchivo, mapeo, lineas });
      setResultado(r);
      if (!r.ok) setError(r.error);
    });
  }

  if (resultado?.ok) {
    return (
      <div className="space-y-4 rounded-lg border p-4">
        <p className="text-lg font-semibold">Lista importada: {resultado.total} líneas</p>
        <ul className="text-sm">
          <li>{resultado.vinculadas} ya estaban vinculadas a tu catálogo (precios actualizados)</li>
          <li>{resultado.pendientes} nuevas, por emparejar</li>
          {resultado.ignoradas ? <li>{resultado.ignoradas} ignoradas (las marcaste antes)</li> : null}
        </ul>
        <div className="flex flex-wrap gap-2">
          {resultado.pendientes > 0 ? (
            <Button nativeButton={false} render={<Link href="/admin/listas/emparejar" />}>Emparejar las nuevas</Button>
          ) : null}
          <Button variant="outline" nativeButton={false} render={<Link href="/admin/precios" />}>
            Ver precios
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setResultado(null);
              setTabla(null);
              setMapeo(null);
              setPegado("");
              setEditandoPegado(true);
            }}
          >
            Importar otra lista
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="proveedor">1. Proveedor</Label>
          <select
            id="proveedor"
            className={selectClase}
            value={proveedorId}
            onChange={(e) => setProveedorId(e.target.value)}
          >
            <option value="">Elegí…</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="fecha">Fecha de la lista</Label>
          <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
      </div>

      <div className="space-y-3">
        <Label>2. La lista</Label>
        <Input type="file" accept=".xlsx,.xls,.csv,.txt,.pdf" onChange={alElegirArchivo} />
        <p className="text-xs text-muted-foreground">
          Excel (.xlsx) o CSV tal como te lo manda el proveedor. Si te llega en PDF o imagen, abrilo, copiá
          la tabla y pegala aquí:
        </p>
        {editandoPegado || !pegado.trim() ? (
          <>
            <Textarea
              rows={enfocado ? 14 : 3}
              placeholder="Pegá aquí las filas copiadas desde Excel (con encabezados)…"
              value={pegado}
              onFocus={() => setEnfocado(true)}
              onBlur={() => setEnfocado(false)}
              onChange={(e) => setPegado(e.target.value)}
              className="max-h-[60vh] resize-y"
            />
            <Button
              variant="outline"
              size="sm"
              disabled={!pegado.trim()}
              onClick={() => {
                cargar(leerTexto(pegado), "pegado");
                setEditandoPegado(false);
              }}
            >
              Leer lo pegado
            </Button>
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
            <span>
              Lo pegado: {pegado.split(/\r?\n/).filter((l) => l.trim()).length} filas
            </span>
            <Button variant="outline" size="sm" onClick={() => setEditandoPegado(true)}>
              Editar lo pegado
            </Button>
          </div>
        )}
      </div>

      {mapeo && tabla ? (
        <div className="space-y-4">
          <div>
            <Label>3. Revisá las columnas</Label>
            <p className="text-xs text-muted-foreground">
              Las detecté solas; corregilas si alguna está mal.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {campo("descripcion", "Descripción", false)}
            {campo("marca", "Marca (si va aparte)", true)}
            {campo("precio", "Precio (tu costo)", false)}
            {campo("stock", "Existencia", true)}
            {campo("sku", "Código", true)}
            {campo("precioSugerido", "Precio sugerido", true)}
          </div>

          <div>
            <p className="text-sm font-medium">
              Vista previa: {lineas.length} líneas con precio
              {lineas.length < tabla.length - 1 ? (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  (salté {tabla.length - 1 - lineas.length} filas sin precio: títulos o vacías)
                </span>
              ) : null}
            </p>
            <div className="mt-2 overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="bg-muted text-left">
                  <tr>
                    <th className="p-2 text-right text-muted-foreground">#</th>
                    <th className="p-2">Descripción del proveedor</th>
                    <th className="p-2 text-right">Precio</th>
                    <th className="p-2 text-right">Exist.</th>
                    <th className="p-2">Lo entendí como</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((l, n) => {
                    const i = interpretar(l.descripcion);
                    return (
                      <tr key={desde + n} className="border-t">
                        <td className="p-2 text-right text-muted-foreground tabular-nums">{desde + n + 1}</td>
                        <td className="p-2">
                          {l.descripcion}
                          {l.sku ? <span className="block text-muted-foreground">{l.sku}</span> : null}
                        </td>
                        <td className="p-2 text-right tabular-nums">${l.precio.toFixed(2)}</td>
                        <td className="p-2 text-right tabular-nums">{l.stock ?? "—"}</td>
                        <td className="p-2">
                          {i.nombreProducto} · {i.nombreVariante}{" "}
                          <Badge variant="secondary">{i.categoria}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {paginas > 1 ? (
              <nav aria-label="Páginas de la vista previa" className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <Button variant="outline" size="sm" disabled={actual === 0} onClick={() => setPagina(actual - 1)}>
                  ← Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  Líneas {desde + 1}–{Math.min(desde + POR_PAGINA, lineas.length)} de {lineas.length} · página {actual + 1} de {paginas}
                </span>
                <Button variant="outline" size="sm" disabled={actual >= paginas - 1} onClick={() => setPagina(actual + 1)}>
                  Siguiente →
                </Button>
              </nav>
            ) : null}
          </div>

          <Button size="lg" disabled={pendiente || lineas.length === 0} onClick={importar}>
            {pendiente ? "Importando…" : `4. Importar ${lineas.length} líneas`}
          </Button>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
