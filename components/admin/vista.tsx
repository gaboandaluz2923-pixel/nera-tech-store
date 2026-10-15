// Cómo se ve la información cuando no se está editando: etiqueta pequeña arriba y el dato como texto.

export const VACIO = <span className="text-muted-foreground">—</span>;

export function Datos({ children, columnas = 2 }: { children: React.ReactNode; columnas?: 1 | 2 | 3 }) {
  const grid = columnas === 1 ? "" : columnas === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";
  return <dl className={`grid gap-x-6 gap-y-3 ${grid}`}>{children}</dl>;
}

export function Dato({
  etiqueta,
  children,
  ancho,
}: {
  etiqueta: React.ReactNode;
  children?: React.ReactNode;
  /** Ocupa toda la fila */
  ancho?: boolean;
}) {
  const vacio = children === null || children === undefined || children === "" || (Array.isArray(children) && !children.length);
  return (
    <div className={ancho ? "sm:col-span-full" : undefined}>
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="mt-0.5 text-sm break-words whitespace-pre-line">{vacio ? VACIO : children}</dd>
    </div>
  );
}

/** Lista de líneas como viñetas (o — si está vacía). */
export function Lineas({ items }: { items: string[] | null | undefined }) {
  if (!items?.length) return VACIO;
  return (
    <ul className="list-disc space-y-0.5 pl-5">
      {items.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ul>
  );
}

export const siNo = (v: unknown) => (v ? "Sí" : "No");
