import { PackageCheck, ShieldCheck, Truck, Wallet } from "lucide-react";

// Confianza como infraestructura: las 4 razones para comprar sin miedo, siempre a la vista.
export function BarraConfianza({
  mesesGarantia = 12,
  hasta = false,
  textoGarantia = "Por escrito, con Nera Tech",
  compacta = false,
  condicion = "nuevo",
}: {
  mesesGarantia?: number;
  /** "Garantía de hasta N meses" (cuando la página mezcla celulares y accesorios) */
  hasta?: boolean;
  textoGarantia?: string;
  compacta?: boolean;
  condicion?: "nuevo" | "open_box" | "usado";
}) {
  const items = [
    { icono: Wallet, titulo: "Pagás al recibir", texto: "Efectivo contra entrega" },
    { icono: ShieldCheck, titulo: `Garantía de ${hasta ? "hasta " : ""}${mesesGarantia} meses`, texto: textoGarantia },
    condicion === "nuevo"
      ? { icono: PackageCheck, titulo: "Nuevos y sellados", texto: "IMEI verificado" }
      : { icono: PackageCheck, titulo: "Revisado por Nera Tech", texto: "IMEI verificado" },
    { icono: Truck, titulo: "Envío a todo el país", texto: "En menos de 48 horas" },
  ];
  return (
    <ul className={`grid grid-cols-2 gap-2 ${compacta ? "" : "sm:grid-cols-4"}`}>
      {items.map(({ icono: Icono, titulo, texto }) => (
        <li key={titulo} className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
          <Icono className="mt-0.5 size-5 shrink-0 text-marca" aria-hidden />
          <span>
            <span className="block text-sm font-semibold">{titulo}</span>
            <span className="block text-xs text-muted-foreground">{texto}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
