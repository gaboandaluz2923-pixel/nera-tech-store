import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { emitirDePedido, guardarFiscalesCliente } from "@/app/admin/(protegido)/facturacion/actions";
import { CamposFiscales } from "@/components/admin/campos-mh";
import { COLUMNAS_DTE, ListaDte, type DocDte } from "@/components/admin/documentos-dte";
import { Editable } from "@/components/admin/editable";
import { BotonGuardar, FormularioAccion } from "@/components/admin/formulario-accion";
import { Dato, Datos } from "@/components/admin/vista";
import { textoDireccion } from "@/lib/dte/catalogos";
import { configDte, faltantesFiscales, tocaFacturar, type DatosFiscales } from "@/lib/dte/emitir";
import { ambienteActual } from "@/lib/dte/mh";
import { createServiceClient } from "@/lib/supabase/server";

// Factura electrónica propia dentro del detalle del pedido: documentos emitidos, emitir factura o
// crédito fiscal, datos fiscales del cliente, reenviar, corregir, nota de crédito y anular.

type PedidoFactura = {
  id: string;
  estado: string;
  forma_pago: string;
  pagado_en: string | null;
  confirmado_en: string | null;
  entregado_en: string | null;
  factura_estado: string;
  cliente_id: string | null;
  facturacion: { tipo: string; nit?: string; nrc?: string; nombre?: string; giro?: string };
  entrega: { correo?: string | null; telefono?: string | null };
};

/** ¿Está encendida la facturación propia? (si no, el pedido sigue con la factura anotada a mano) */
export async function facturacionPropiaActiva() {
  return (await configDte()).activo;
}

export async function FacturaPedido({ p, admin }: { p: PedidoFactura; admin: boolean }) {
  const sb = createServiceClient();
  const ambiente = ambienteActual();
  const [{ data: docsData }, { data: cliente }] = await Promise.all([
    sb.from("dte_documentos").select(COLUMNAS_DTE).eq("pedido_id", p.id).eq("prueba", false).order("created_at", { ascending: false }),
    p.cliente_id ? sb.from("clientes").select("datos_fiscales").eq("id", p.cliente_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const docs = (docsData ?? []) as unknown as DocDte[];
  const vigente = docs.find((d) => ["01", "03"].includes(d.tipo_dte) && ["pendiente", "procesado", "contingencia"].includes(d.estado) && d.ambiente === ambiente);
  const pideCredito = p.facturacion?.tipo === "credito_fiscal";
  const guardados = (cliente?.datos_fiscales ?? null) as DatosFiscales | null;
  // Si todavía no hay datos fiscales guardados, se arranca con lo que escribió en el checkout
  const fiscales: Partial<DatosFiscales> = guardados ?? {
    nit: p.facturacion?.nit?.replace(/\D/g, ""),
    nrc: p.facturacion?.nrc?.replace(/\D/g, ""),
    nombre: p.facturacion?.nombre,
    correo: p.entrega?.correo ?? null,
    telefono: p.entrega?.telefono ?? null,
  };
  const faltanFiscales = faltantesFiscales(guardados);
  // ¿Ya ocurrió la venta? (pagado y confirmado; contra entrega: entregado)
  const listo = tocaFacturar({ ...p, factura_estado: "pendiente" });

  return (
    <div className="space-y-4">
      {ambiente === "00" ? (
        <p className="flex items-start gap-2 rounded-md bg-amber-50 p-2 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> Ambiente de pruebas: lo que se emita aquí no tiene valor legal, no cambia el pedido ni le llega al cliente.
        </p>
      ) : null}

      {docs.length ? <ListaDte docs={docs} admin={admin} conPedido={false} /> : null}

      {!vigente && p.estado !== "cancelado" ? (
        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-sm">
            {listo
              ? "Este pedido ya se puede facturar."
              : p.forma_pago === "contra_entrega"
                ? "Contra entrega: la factura se emite al entregar y cobrar (podés emitirla antes si el cliente ya pagó)."
                : "Se factura cuando esté confirmado y pagado."}
          </p>
          <div className="flex flex-wrap gap-2">
            <FormularioAccion accion={emitirDePedido}>
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="tipo" value={pideCredito ? "03" : "01"} />
              <BotonGuardar size="sm">{pideCredito ? "Emitir crédito fiscal" : "Emitir factura"}</BotonGuardar>
            </FormularioAccion>
            <FormularioAccion accion={emitirDePedido}>
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="tipo" value={pideCredito ? "01" : "03"} />
              <BotonGuardar size="sm" variant="outline">
                {pideCredito ? "Emitir factura (consumidor final)" : "Emitir crédito fiscal"}
              </BotonGuardar>
            </FormularioAccion>
          </div>
          <p className="text-xs text-muted-foreground">
            Se firma, se envía a Hacienda y, al recibirla, le llega al cliente por correo con el PDF y el JSON. El crédito fiscal usa los datos fiscales
            de abajo.
          </p>
        </div>
      ) : null}

      {pideCredito || docs.some((d) => d.tipo_dte === "03") || guardados ? (
        p.cliente_id ? (
          <Editable
            titulo="Datos fiscales del cliente"
            descripcion="Para el crédito fiscal. Quedan guardados en el cliente para la próxima compra."
            accion={guardarFiscalesCliente}
            vista={
              <div className="space-y-2">
                {faltanFiscales.length ? (
                  <p className="flex items-start gap-2 rounded-md bg-amber-50 p-2 text-xs text-amber-900">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> Falta: {faltanFiscales.join(", ")}.
                  </p>
                ) : null}
                <Datos>
                  <Dato etiqueta="Razón social">{fiscales.nombre}</Dato>
                  <Dato etiqueta="NIT · NRC">
                    {[fiscales.nit?.length === 14 ? `${fiscales.nit.slice(0, 4)}-${fiscales.nit.slice(4, 10)}-${fiscales.nit.slice(10, 13)}-${fiscales.nit.slice(13)}` : fiscales.nit, fiscales.nrc]
                      .filter(Boolean)
                      .join(" · ")}
                  </Dato>
                  <Dato etiqueta="Actividad" ancho>
                    {fiscales.codActividad ? `${fiscales.codActividad} · ${fiscales.descActividad}` : p.facturacion?.giro ? `Escribió: ${p.facturacion.giro}` : null}
                  </Dato>
                  <Dato etiqueta="Dirección" ancho>
                    {fiscales.direccion ? textoDireccion(fiscales.direccion) : null}
                  </Dato>
                  <Dato etiqueta="Retiene 1%">{fiscales.retiene1 ? "Sí (gran contribuyente)" : "No"}</Dato>
                  <Dato etiqueta="Correo">{fiscales.correo}</Dato>
                </Datos>
              </div>
            }
          >
            <input type="hidden" name="cliente_id" value={p.cliente_id} />
            <input type="hidden" name="pedido_id" value={p.id} />
            <CamposFiscales valor={fiscales} />
          </Editable>
        ) : (
          <p className="text-xs text-muted-foreground">El pedido no tiene cliente enlazado: enlazalo con su correo para guardar los datos fiscales.</p>
        )
      ) : null}

      {admin ? (
        <p className="text-xs text-muted-foreground">
          Todos los documentos están en <Link href="/admin/facturacion" className="text-primary hover:underline">Facturación</Link>.
        </p>
      ) : null}
    </div>
  );
}
