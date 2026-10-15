import type { Metadata } from "next";
import { CheckoutFormulario } from "@/components/tienda/checkout-formulario";
import { configTienda } from "@/lib/tienda/datos";
import { DEPARTAMENTOS, MINIMO_TASA_CERO, OTRA_ZONA } from "@/lib/tienda/pedidos";

export const metadata: Metadata = {
  title: "Finalizar compra",
  robots: { index: false, follow: false },
};

export default async function PaginaCheckout() {
  const c = await configTienda();
  // Alto mínimo: el carrito se lee en el navegador; así el pie no salta mientras aparece (CLS)
  return (
    <div className="mx-auto min-h-[100svh] max-w-5xl px-4 pt-6 pb-16">
      <h1 className="mb-6 text-2xl font-bold">Finalizar compra</h1>
      <CheckoutFormulario
        zonasContraEntrega={c.municipiosContraEntrega}
        reglaContraEntrega={c.contraEntrega}
        departamentos={DEPARTAMENTOS}
        otraZona={OTRA_ZONA}
        mesesTasaCero={c.tasaCero.meses}
        minimoTasaCero={MINIMO_TASA_CERO}
      />
    </div>
  );
}
