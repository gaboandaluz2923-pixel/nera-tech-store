import { Encabezado } from "@/components/tienda/encabezado";
import { Pie } from "@/components/tienda/pie";
import { WhatsAppFlotante } from "@/components/tienda/whatsapp-flotante";
import { BarraComparar } from "@/components/tienda/comparar";

export default function LayoutTienda({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Encabezado />
      <main className="flex-1">{children}</main>
      <Pie />
      <WhatsAppFlotante />
      <BarraComparar />
    </>
  );
}
