"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACTIVIDADES_MH, DEPARTAMENTOS_MH, DISTRITOS_MH, MUNICIPIOS_MH, type DireccionMH } from "@/lib/dte/catalogos";

// Campos con los catálogos de Hacienda: dirección (departamento → municipio y distrito) y actividad económica.
// Se usan en los datos del emisor (Facturación) y en el crédito fiscal de un pedido.

const titulo = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, (x) => x.toUpperCase());
const SELECT = "h-9 w-full rounded-md border bg-background px-2 text-sm";

export function DireccionHacienda({ prefijo, valor }: { prefijo: string; valor?: Partial<DireccionMH> | null }) {
  const [depto, setDepto] = useState(valor?.departamento ?? "");
  const municipios = useMemo(() => MUNICIPIOS_MH.filter((m) => m.departamento === depto && m.codigo !== "00"), [depto]);
  const distritos = useMemo(() => DISTRITOS_MH.filter((m) => m.departamento === depto && m.codigo !== "00"), [depto]);
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="space-y-1">
        <Label htmlFor={`${prefijo}departamento`}>Departamento</Label>
        <select id={`${prefijo}departamento`} name={`${prefijo}departamento`} className={SELECT} value={depto} onChange={(e) => setDepto(e.target.value)}>
          <option value="">Elegí…</option>
          {DEPARTAMENTOS_MH.filter((d) => d.codigo !== "00").map((d) => (
            <option key={d.codigo} value={d.codigo}>
              {d.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${prefijo}municipio`}>Municipio</Label>
        <select
          key={`m-${depto}`}
          id={`${prefijo}municipio`}
          name={`${prefijo}municipio`}
          className={SELECT}
          defaultValue={valor?.departamento === depto ? (valor?.municipio ?? "") : ""}
          disabled={!depto}
        >
          <option value="">Elegí…</option>
          {municipios.map((m) => (
            <option key={m.codigo} value={m.codigo}>
              {titulo(m.nombre)}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${prefijo}distrito`}>Distrito</Label>
        <select
          key={`d-${depto}`}
          id={`${prefijo}distrito`}
          name={`${prefijo}distrito`}
          className={SELECT}
          defaultValue={valor?.departamento === depto ? (valor?.distrito ?? "") : ""}
          disabled={!depto}
        >
          <option value="">Elegí…</option>
          {distritos.map((m) => (
            <option key={m.codigo} value={m.codigo}>
              {titulo(m.nombre)}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">El municipio de antes (ej. San Salvador, Mejicanos).</p>
      </div>
      <div className="space-y-1 sm:col-span-3">
        <Label htmlFor={`${prefijo}complemento`}>Dirección (colonia, calle, número)</Label>
        <Input id={`${prefijo}complemento`} name={`${prefijo}complemento`} defaultValue={valor?.complemento ?? ""} maxLength={180} />
      </div>
    </div>
  );
}

/** Actividad económica (CAT-019): se escribe para buscar y se elige de la lista. */
export function ActividadHacienda({ nombre, valor, etiqueta = "Actividad económica" }: { nombre: string; valor?: string | null; etiqueta?: string }) {
  const actual = valor ? ACTIVIDADES_MH.find((a) => a.codigo === valor) : null;
  return (
    <div className="space-y-1">
      <Label htmlFor={`act-${nombre}`}>{etiqueta}</Label>
      <Input
        id={`act-${nombre}`}
        name={nombre}
        list={`lista-act-${nombre}`}
        defaultValue={actual ? `${actual.codigo} · ${actual.nombre}` : (valor ?? "")}
        placeholder="Escribí el código o una palabra (ej. 47412 o telecomunicación)"
        autoComplete="off"
      />
      <datalist id={`lista-act-${nombre}`}>
        {ACTIVIDADES_MH.map((a) => (
          <option key={a.codigo} value={`${a.codigo} · ${a.nombre}`} />
        ))}
      </datalist>
      <p className="text-xs text-muted-foreground">La que aparece en la tarjeta de NIT o en el registro de IVA.</p>
    </div>
  );
}

type Fiscales = {
  nit?: string | null;
  nrc?: string | null;
  nombre?: string | null;
  nombreComercial?: string | null;
  codActividad?: string | null;
  direccion?: Partial<DireccionMH> | null;
  telefono?: string | null;
  correo?: string | null;
  retiene1?: boolean;
};

/** Datos de un cliente (empresa) para el comprobante de crédito fiscal. Campos con prefijo f_. */
export function CamposFiscales({ valor, conRetencion = true }: { valor?: Fiscales | null; conRetencion?: boolean }) {
  const v = valor ?? {};
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="f_nombre">Nombre o razón social</Label>
          <Input id="f_nombre" name="f_nombre" defaultValue={v.nombre ?? ""} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="f_nombre_comercial">Nombre comercial (opcional)</Label>
          <Input id="f_nombre_comercial" name="f_nombre_comercial" defaultValue={v.nombreComercial ?? ""} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="f_nit">NIT</Label>
          <Input id="f_nit" name="f_nit" defaultValue={v.nit ?? ""} inputMode="numeric" placeholder="0614-280390-112-1" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="f_nrc">NRC (registro de IVA)</Label>
          <Input id="f_nrc" name="f_nrc" defaultValue={v.nrc ?? ""} inputMode="numeric" placeholder="123456-7" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="f_telefono">Teléfono (opcional)</Label>
          <Input id="f_telefono" name="f_telefono" defaultValue={v.telefono ?? ""} inputMode="tel" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="f_correo">Correo para enviarle el documento</Label>
          <Input id="f_correo" name="f_correo" type="email" defaultValue={v.correo ?? ""} />
        </div>
      </div>
      <ActividadHacienda nombre="f_actividad" valor={v.codActividad} />
      <DireccionHacienda prefijo="f_dir_" valor={v.direccion} />
      {conRetencion ? (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="f_retiene1" defaultChecked={Boolean(v.retiene1)} className="mt-0.5 size-4 accent-[var(--marca)]" />
          <span>
            Es gran contribuyente (agente de retención): nos retiene 1% de IVA en compras desde $100 sin IVA.
          </span>
        </label>
      ) : null}
    </div>
  );
}
