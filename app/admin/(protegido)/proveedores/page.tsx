import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/server";
import { guardarProveedor } from "./actions";

type Proveedor = {
  id: string;
  nombre: string;
  tipo: "local" | "importacion";
  contacto: string | null;
  telefono: string | null;
  correo: string | null;
  plazo_credito_dias: number;
  transporte_lote: number;
  flete_lote: number;
  seguro_lote: number;
  dai_pct: number;
  iva_pct: number;
  unidades_lote: number;
  activo: boolean;
};

const VACIO: Proveedor = {
  id: "",
  nombre: "",
  tipo: "local",
  contacto: null,
  telefono: null,
  correo: null,
  plazo_credito_dias: 0,
  transporte_lote: 0,
  flete_lote: 0,
  seguro_lote: 0,
  dai_pct: 0,
  iva_pct: 13,
  unidades_lote: 20,
  activo: true,
};

function Campo({
  nombre,
  etiqueta,
  valor,
  tipo = "text",
  ayuda,
  prefijo,
}: {
  prefijo: string;
  nombre: string;
  etiqueta: string;
  valor: string | number | null;
  tipo?: string;
  ayuda?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={`${prefijo}-${nombre}`}>{etiqueta}</Label>
      <Input
        id={`${prefijo}-${nombre}`}
        name={nombre}
        type={tipo}
        step={tipo === "number" ? "0.01" : undefined}
        min={tipo === "number" ? "0" : undefined}
        defaultValue={valor ?? ""}
      />
      {ayuda ? <p className="text-xs text-muted-foreground">{ayuda}</p> : null}
    </div>
  );
}

function Formulario({ p }: { p: Proveedor }) {
  return (
    <form action={guardarProveedor} className="space-y-4">
      <input type="hidden" name="id" value={p.id} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Campo prefijo={p.id || "nuevo"} nombre="nombre" etiqueta="Nombre" valor={p.nombre} />
        <div className="space-y-1">
          <Label htmlFor={`${p.id || "nuevo"}-tipo`}>Tipo</Label>
          <select
            id={`${p.id || "nuevo"}-tipo`}
            name="tipo"
            defaultValue={p.tipo}
            className="h-9 w-full rounded-lg border bg-background px-2 text-sm"
          >
            <option value="local">Local (precio puesto en El Salvador)</option>
            <option value="importacion">Importación (Miami u otro)</option>
          </select>
        </div>
        <Campo
          prefijo={p.id || "nuevo"}
          nombre="plazo_credito_dias"
          etiqueta="Días de crédito"
          valor={p.plazo_credito_dias}
          tipo="number"
          ayuda="Desempata entre proveedores con el mismo costo"
        />
        <Campo prefijo={p.id || "nuevo"} nombre="contacto" etiqueta="Contacto" valor={p.contacto} />
        <Campo prefijo={p.id || "nuevo"} nombre="telefono" etiqueta="Teléfono" valor={p.telefono} />
        <Campo prefijo={p.id || "nuevo"} nombre="correo" etiqueta="Correo" valor={p.correo} tipo="email" />
      </div>
      <details className="rounded-lg border p-3" open={p.tipo === "importacion"}>
        <summary className="cursor-pointer text-sm font-medium">Costos por lote (para el costo puesto)</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Campo prefijo={p.id || "nuevo"} nombre="unidades_lote" etiqueta="Unidades por lote" valor={p.unidades_lote} tipo="number" />
          <Campo prefijo={p.id || "nuevo"} nombre="transporte_lote" etiqueta="Transporte por lote ($)" valor={p.transporte_lote} tipo="number" />
          <Campo prefijo={p.id || "nuevo"} nombre="flete_lote" etiqueta="Flete por lote ($)" valor={p.flete_lote} tipo="number" />
          <Campo prefijo={p.id || "nuevo"} nombre="seguro_lote" etiqueta="Seguro por lote ($)" valor={p.seguro_lote} tipo="number" />
          <Campo prefijo={p.id || "nuevo"} nombre="dai_pct" etiqueta="DAI (%)" valor={p.dai_pct} tipo="number" ayuda="Solo importación" />
          <Campo prefijo={p.id || "nuevo"} nombre="iva_pct" etiqueta="IVA (%)" valor={p.iva_pct} tipo="number" ayuda="Solo importación" />
        </div>
      </details>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="activo" defaultChecked={p.activo} className="size-4" />
          Activo
        </label>
        <Button type="submit">{p.id ? "Guardar" : "Agregar proveedor"}</Button>
      </div>
    </form>
  );
}

async function Contenido() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("proveedores").select("*").order("nombre");
  if (error) throw error;
  const proveedores = (data ?? []) as Proveedor[];
  return (
    <div className="space-y-4">
      {proveedores.map((p) => (
        <Card key={p.id}>
          <CardHeader>
            <CardTitle>
              {p.nombre}
              {!p.activo ? <span className="ml-2 text-sm font-normal text-muted-foreground">(inactivo)</span> : null}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Formulario p={p} />
          </CardContent>
        </Card>
      ))}
      <Card>
        <CardHeader>
          <CardTitle>Nuevo proveedor</CardTitle>
        </CardHeader>
        <CardContent>
          <Formulario p={VACIO} />
        </CardContent>
      </Card>
    </div>
  );
}

export default function Proveedores() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Proveedores</h1>
        <p className="text-muted-foreground">
          A los proveedores locales solo se les suman los costos por lote si los tenés (ej. transporte). A
          los de importación se les suma flete, seguro, DAI e IVA para calcular el costo puesto.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <Contenido />
      </Suspense>
    </div>
  );
}
