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
    const valor = mapeo[nombre];
    return (
      <div className="space-y-1">
        <Label>{etiqueta}</Label>
        <select
          className={selectClase}
          value={valor === null ? "" : String(valor)}
          onChange={(e) =>
            setMapeo({ ...mapeo, [nombre]: e.target.value === "" ? null : Number(e.target.value) })
          }
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
        <Textarea
          rows={4}
          placeholder="Pegá aquí las filas copiadas desde Excel (con encabezados)…"
          value={pegado}
          onChange={(e) => setPegado(e.target.value)}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={!pegado.trim()}
          onClick={() => cargar(leerTexto(pegado), "pegado")}
        >
          Leer lo pegado
        </Button>
      </div>

      {mapeo && tabla ? (
        <div className="space-y-4">
          <div>
            <Label>3. Revisá las columnas</Label>
            <p className="text-xs text-muted-foreground">
              Las detecté solas; corregilas si alguna está mal.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-5">
            {campo("descripcion", "Descripción", false)}
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
            <div className="mt-2 max-h-96 overflow-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted text-left">
                  <tr>
                    <th className="p-2">Descripción del proveedor</th>
                    <th className="p-2 text-right">Precio</th>
                    <th className="p-2 text-right">Exist.</th>
                    <th className="p-2">Lo entendí como</th>
                  </tr>
                </thead>
                <tbody>
                  {lineas.slice(0, 60).map((l, n) => {
                    const i = interpretar(l.descripcion);
                    return (
                      <tr key={n} className="border-t">
                        <td className="p-2">{l.descripcion}</td>
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
            {lineas.length > 60 ? (
              <p className="mt-1 text-xs text-muted-foreground">Mostrando 60 de {lineas.length}.</p>
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
