"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { BotonGuardar, FormularioAccion, type EstadoAccion } from "@/components/admin/formulario-accion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Formulario de "+ Nuevo producto" (Catálogo): nombre, categoría, variantes (memoria y color) y, para
// administradores, el proveedor y lo que cuesta. Al guardar se abre la ficha del producto nuevo.

const SELECT = "h-9 w-full rounded-md border bg-background px-2 text-sm";
type Fila = { n: number };

export function NuevoProducto({
  accion,
  categorias,
  proveedores,
}: {
  accion: (prev: EstadoAccion, form: FormData) => Promise<EstadoAccion>;
  categorias: { id: string; nombre: string }[];
  /** null = quien está creando no es administrador (no ve costos) */
  proveedores: { id: string; nombre: string }[] | null;
}) {
  const [filas, setFilas] = useState<Fila[]>([{ n: 0 }]);
  const [siguiente, setSiguiente] = useState(1);

  return (
    <FormularioAccion accion={accion} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>1. El producto</CardTitle>
          <CardDescription>Como querés que se vea en la tienda: marca y modelo, sin memoria ni color.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" name="nombre" required minLength={3} placeholder="Ej. Xiaomi Redmi Note 17 Pro 5G" autoFocus />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="categoria_id">Categoría</Label>
              <select id="categoria_id" name="categoria_id" required defaultValue="" className={SELECT}>
                <option value="" disabled>
                  — Elegí —
                </option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="marca">Marca (opcional)</Label>
              <Input id="marca" name="marca" placeholder="Se toma del nombre si lo dejás vacío" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Variantes (memoria y color)</CardTitle>
          <CardDescription>
            Una fila por cada memoria y color que vas a vender. Si no tiene memoria (audífonos, cargadores), poné solo el color, o
            nada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {filas.map((f, i) => (
            <div key={f.n} className="grid grid-cols-[1fr_1fr_1.4fr_auto] items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor={`ram-${f.n}`} className="text-xs">
                  RAM (GB)
                </Label>
                <Input id={`ram-${f.n}`} name="ram" inputMode="numeric" placeholder="6" />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`alm-${f.n}`} className="text-xs">
                  Almacenamiento (GB)
                </Label>
                <Input id={`alm-${f.n}`} name="alm" inputMode="numeric" placeholder="256" />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`color-${f.n}`} className="text-xs">
                  Color
                </Label>
                <Input id={`color-${f.n}`} name="color" placeholder="Negro" />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="mb-0.5"
                disabled={filas.length === 1}
                onClick={() => setFilas((x) => x.filter((y) => y.n !== f.n))}
                aria-label={`Quitar la fila ${i + 1}`}
                title="Quitar esta fila"
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setFilas((x) => [...x, { n: siguiente }]);
              setSiguiente((s) => s + 1);
            }}
          >
            <Plus className="size-4" aria-hidden /> Otra variante
          </Button>
        </CardContent>
      </Card>

      {proveedores ? (
        <Card>
          <CardHeader>
            <CardTitle>3. Proveedor y costo (opcional)</CardTitle>
            <CardDescription>
              Si lo ponés, el producto aparece en Precios con su margen. Si viene en una lista de precios, mejor importala en Listas.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="proveedor_id">Proveedor</Label>
              <select id="proveedor_id" name="proveedor_id" defaultValue="" className={SELECT}>
                <option value="">— Ninguno —</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="costo">Costo c/u (precio de lista)</Label>
              <Input id="costo" name="costo" inputMode="decimal" placeholder="320.00" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sku">Código del proveedor (opcional)</Label>
              <Input id="sku" name="sku" placeholder="CE006XIA62" />
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <BotonGuardar>Crear producto</BotonGuardar>
        <p className="text-xs text-muted-foreground">
          Queda oculto. Después subís fotos, completás los textos y le ponés precio para publicarlo.
        </p>
      </div>
    </FormularioAccion>
  );
}
