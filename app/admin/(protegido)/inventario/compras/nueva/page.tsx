import Link from "next/link";
import { Suspense } from "react";
import { BotonGuardar, FormularioAccion } from "@/components/admin/formulario-accion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DOCUMENTO } from "@/lib/admin/compras";
import { superAdmin } from "@/lib/admin/sesion";
import { crearCompra } from "../../actions";

// Nueva compra: subir la factura (JSON del DTE o PDF) para que se llene sola, o escribirla a mano.

const SELECT = "h-9 w-full rounded-md border bg-background px-2 text-sm";

async function Formulario() {
  const { supabase } = await superAdmin();
  const { data: proveedores } = await supabase.from("proveedores").select("id, nombre, plazo_credito_dias").eq("activo", true).order("nombre");
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/El_Salvador" });
  return (
    <FormularioAccion accion={crearCompra} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>1. La factura (opcional, pero ahorra digitar)</CardTitle>
          <CardDescription>
            Subí el <b>.json</b> de la factura electrónica (llega en el mismo correo que el PDF): se lee exacto. Si solo tenés el PDF,
            subilo y se intenta leer; revisá las líneas después. Podés subir los dos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input name="archivo" type="file" accept=".json,.pdf,application/json,application/pdf" multiple />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Datos de la compra</CardTitle>
          <CardDescription>Lo que dejes vacío se toma de la factura que subiste (si se pudo leer).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="proveedor_id">Proveedor</Label>
              <select id="proveedor_id" name="proveedor_id" defaultValue="" className={SELECT}>
                <option value="">— Según la factura —</option>
                {(proveedores ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                    {Number(p.plazo_credito_dias) ? ` (crédito ${p.plazo_credito_dias} días)` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="numero">Número de factura</Label>
              <Input id="numero" name="numero" placeholder="DTE-03-… o el número impreso" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fecha">Fecha de la factura</Label>
              <Input id="fecha" name="fecha" type="date" defaultValue={hoy} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="documento">Tipo de documento</Label>
              <select id="documento" name="documento" defaultValue="" className={SELECT}>
                <option value="">— Según la factura (si no, crédito fiscal) —</option>
                {Object.entries(DOCUMENTO).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="condicion">Pago</Label>
              <select id="condicion" name="condicion" defaultValue="" className={SELECT}>
                <option value="">— Según la factura o el proveedor —</option>
                <option value="contado">Contado</option>
                <option value="credito">Crédito</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="dias_credito">Días de crédito</Label>
              <Input id="dias_credito" name="dias_credito" type="number" min="0" max="180" list="dias-comunes" placeholder="10, 14…" />
              <datalist id="dias-comunes">
                <option value="10" />
                <option value="14" />
                <option value="15" />
                <option value="30" />
              </datalist>
            </div>
            <div className="space-y-1">
              <Label htmlFor="otros_costos">Otros costos de esta compra (USD)</Label>
              <Input id="otros_costos" name="otros_costos" inputMode="decimal" placeholder="0.00" />
              <p className="text-xs text-muted-foreground">
                Flete, envío, aduana, seguro… Se reparten en el costo de cada unidad según su valor. No se suman a lo que se le debe al
                proveedor.
              </p>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="notas">Notas</Label>
            <Textarea id="notas" name="notas" rows={2} />
          </div>
        </CardContent>
      </Card>
      <div className="flex flex-wrap items-center gap-3">
        <BotonGuardar>Crear compra</BotonGuardar>
        <p className="text-xs text-muted-foreground">
          Después revisás las líneas, pegás los IMEI o números de serie (si ya los tenés) y tocás <b>Recibir</b> para que entre a bodega.
        </p>
      </div>
    </FormularioAccion>
  );
}

export default function NuevaCompra() {
  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <Link href="/admin/inventario/compras" className="text-sm text-muted-foreground hover:underline">
          ← Compras
        </Link>
        <h1 className="text-xl font-semibold">Nueva compra</h1>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <Formulario />
      </Suspense>
    </div>
  );
}
