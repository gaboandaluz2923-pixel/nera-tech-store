import { Encabezado } from "@/components/tienda/encabezado";
import { Pie } from "@/components/tienda/pie";
import { WhatsAppFlotante } from "@/components/tienda/whatsapp-flotante";
import { BarraComparar } from "@/components/tienda/comparar";
import { CarritoHoja } from "@/components/tienda/carrito-hoja";
import { Medicion } from "@/components/tienda/medicion";
import { Suspense } from "react";
import { catalogo } from "@/lib/tienda/datos";

// Accesorios que se ofrecen en el carrito ("Completá tu equipo") cuando hay un celular
async function Carrito() {
  const accesorios = (await catalogo()).filter(
    (p) => !["celulares", "tablets"].includes(p.categoria) && p.disponibilidad !== "agotado" && p.varianteDestacada
  );
  return <CarritoHoja accesorios={accesorios} />;
}

export default function LayoutTienda({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Encabezado />
      <main className="flex-1">{children}</main>
      <Pie />
      <WhatsAppFlotante />
      <BarraComparar />
      <Carrito />
      <Suspense fallback={null}>
        <Medicion />
      </Suspense>
    </>
  );
}
