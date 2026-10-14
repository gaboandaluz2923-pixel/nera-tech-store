"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { EstadoAccion } from "./formulario-accion";

// Elegí una o varias fotos (también desde el teléfono). Antes de subirlas, el navegador las
// achica a 1600 px como máximo, las pone sobre fondo blanco en un cuadrado y las convierte a WebP.
// Así cada foto pesa ~100 KB y la tienda carga rápido con datos móviles.

const LADO = 1600;

async function preparar(archivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(archivo);
  const escala = Math.min(1, LADO / Math.max(bitmap.width, bitmap.height));
  const ancho = Math.round(bitmap.width * escala);
  const alto = Math.round(bitmap.height * escala);
  const lado = Math.max(ancho, alto);
  const lienzo = document.createElement("canvas");
  lienzo.width = lado;
  lienzo.height = lado;
  const ctx = lienzo.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, lado, lado);
  ctx.drawImage(bitmap, (lado - ancho) / 2, (lado - alto) / 2, ancho, alto);
  bitmap.close();
  const webp = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, "image/webp", 0.85));
  if (webp && webp.type === "image/webp") return webp;
  // Safari viejo no genera WebP: se usa JPG
  return (await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, "image/jpeg", 0.85)))!;
}

export function SubirFotos({
  productoId,
  subir,
}: {
  productoId: string;
  subir: (form: FormData) => Promise<EstadoAccion>;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [progreso, setProgreso] = useState<string | null>(null);
  const router = useRouter();

  async function alElegir(archivos: FileList | null) {
    if (!archivos?.length) return;
    let subidas = 0;
    for (const [i, archivo] of [...archivos].entries()) {
      setProgreso(`Subiendo ${i + 1} de ${archivos.length}…`);
      try {
        const blob = await preparar(archivo);
        const form = new FormData();
        form.set("id", productoId);
        form.set("archivo", new File([blob], `foto.${blob.type === "image/webp" ? "webp" : "jpg"}`, { type: blob.type }));
        const r = await subir(form);
        if (r?.ok) subidas++;
        else toast.error(r?.mensaje ?? "No se pudo subir");
      } catch {
        toast.error(`No se pudo leer "${archivo.name}". Probá con otra foto (JPG, PNG o WebP).`);
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
      <span className="text-xs text-muted-foreground">Fondo blanco y producto centrado. Podés elegir varias a la vez.</span>
    </div>
  );
}
