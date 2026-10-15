import { fechaHora } from "@/lib/tienda/formato";

// Lista "quién hizo qué y cuándo" (pedidos, productos, clientes).

export type Entrada = { id: string | number; cuando: string; quien: string; que: string; detalle?: string | null };

export function ListaHistorial({ entradas, vacio = "Todavía no hay cambios registrados." }: { entradas: Entrada[]; vacio?: string }) {
  if (!entradas.length) return <p className="text-sm text-muted-foreground">{vacio}</p>;
  return (
    <ol className="space-y-2 text-sm">
      {entradas.map((e) => (
        <li key={e.id} className="border-l-2 border-muted pl-3">
          <p>
            <span className="font-medium">{e.quien}</span> {e.que}
          </p>
          {e.detalle ? <p className="text-muted-foreground">{e.detalle}</p> : null}
          <p className="text-xs text-muted-foreground">{fechaHora(e.cuando)}</p>
        </li>
      ))}
    </ol>
  );
}
