"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { EstadoAccion } from "./formulario-accion";
import { ladoMayor, prepararFoto } from "./preparar-foto";

// Elegí una o varias fotos (también desde el teléfono). Antes de subirlas, el navegador las deja como
// las de la tienda: fondo blanco, producto recortado y centrado, cuadradas de 1200 px y en WebP (~100 KB).
// Con "Quitar el fondo" (fotos tomadas con el teléfono) además borra lo que hay detrás del producto.

export function SubirFotos({
  productoId,
  subir,
}: {
  productoId: string;
  subir: (form: FormData) => Promise<EstadoAccion>;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [progreso, setProgreso] = useState<string | null>(null);
  const [quitarFondo, setQuitarFondo] = useState(false);
  const router = useRouter();

  async function alElegir(archivos: FileList | null) {
    if (!archivos?.length) return;
    let subidas = 0;
    for (const [i, archivo] of [...archivos].entries()) {
      setProgreso(
        quitarFondo && i === 0 ? `Quitando el fondo (la primera vez tarda un poco)…` : `Subiendo ${i + 1} de ${archivos.length}…`
      );
      try {
        if ((await ladoMayor(archivo)) < 500) toast.warning(`"${archivo.name}" es chica (menos de 500 px): puede verse borrosa.`);
        const blob = await prepararFoto(archivo, quitarFondo);
        if (quitarFondo) setProgreso(`Subiendo ${i + 1} de ${archivos.length}…`);
        const form = new FormData();
        form.set("id", productoId);
        form.set("archivo", new File([blob], `foto.${blob.type === "image/webp" ? "webp" : "jpg"}`, { type: blob.type }));
        const r = await subir(form);
        if (r?.ok) subidas++;
        else toast.error(r?.mensaje ?? "No se pudo subir");
      } catch (e) {
        console.error(e);
        toast.error(
          quitarFondo
            ? `No se pudo quitar el fondo de "${archivo.name}". Probá de nuevo o subila sin "Quitar el fondo".`
            : `No se pudo leer "${archivo.name}". Probá con otra foto (JPG, PNG o WebP).`
        );
      }
    }
    setProgreso(null);
    if (entrada.current) entrada.current.value = "";
    if (subidas) {
      toast.success(subidas === 1 ? "Foto agregada" : `${subidas} fotos agregadas`);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        ref={entrada}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => alElegir(e.target.files)}
        aria-label="Elegir fotos"
      />
      <Button type="button" onClick={() => entrada.current?.click()} disabled={progreso !== null}>
        {progreso ?? "Subir fotos"}
      </Button>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={quitarFondo}
          onChange={(e) => setQuitarFondo(e.target.checked)}
          disabled={progreso !== null}
          className="size-4 accent-[var(--marca)]"
        />
        Quitar el fondo (fotos tomadas con el teléfono)
      </label>
      <span className="basis-full text-xs text-muted-foreground">
        Se centran y quedan sobre fondo blanco solas. Podés elegir varias a la vez. Revisá cada foto después de subirla.
      </span>
    </div>
  );
}
