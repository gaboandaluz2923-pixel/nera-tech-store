"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Abre un archivo privado con un enlace temporal que pide al servidor en el momento */
export function VerArchivo({
  ruta,
  pedirEnlace,
}: {
  ruta: string;
  pedirEnlace: (ruta: string) => Promise<string | null>;
}) {
  const [abriendo, setAbriendo] = useState(false);
  const nombre = ruta.split("/").pop()?.replace(/^\d+-/, "") ?? "archivo";
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={abriendo}
      onClick={async () => {
        setAbriendo(true);
        // La pestaña se abre antes de esperar (si no, el navegador la bloquea como ventana emergente)
        const ventana = window.open("about:blank", "_blank");
        const url = await pedirEnlace(ruta).catch(() => null);
        setAbriendo(false);
        if (url && ventana) ventana.location.href = url;
        else {
          ventana?.close();
          toast.error("No se pudo abrir el archivo.");
        }
      }}
    >
      <FileText className="size-3.5" aria-hidden />
      {nombre}
    </Button>
  );
}
