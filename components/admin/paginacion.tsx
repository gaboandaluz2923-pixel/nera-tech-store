import Link from "next/link";

export const POR_PAGINA = 25;

/** Número de página desde la URL (?pagina=2), nunca menor que 1 */
export const leerPagina = (v: string | undefined) => Math.max(1, Math.floor(Number(v) || 1));

/** "26–50 de 338" con Anterior / Siguiente. `enlace(n)` arma la dirección de la página n con los mismos filtros. */
export function Paginacion({ pagina, total, enlace }: { pagina: number; total: number; enlace: (n: number) => string }) {
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  if (total <= POR_PAGINA) return total ? <p className="text-xs text-muted-foreground">{total} en total</p> : null;
  const desde = (pagina - 1) * POR_PAGINA + 1;
  const hasta = Math.min(total, pagina * POR_PAGINA);
  const boton = "rounded-md border px-3 py-1.5 text-sm";
  return (
    <nav className="flex flex-wrap items-center justify-between gap-2" aria-label="Páginas">
      <span className="text-sm text-muted-foreground tabular-nums">
        {desde}–{hasta} de {total} · página {pagina} de {paginas}
      </span>
      <span className="flex gap-2">
        {pagina > 1 ? (
          <Link href={enlace(pagina - 1) as "/admin"} className={`${boton} hover:bg-muted`} scroll>
            ← Anterior
          </Link>
        ) : (
          <span className={`${boton} text-muted-foreground opacity-50`}>← Anterior</span>
        )}
        {pagina < paginas ? (
          <Link href={enlace(pagina + 1) as "/admin"} className={`${boton} hover:bg-muted`} scroll>
            Siguiente →
          </Link>
        ) : (
          <span className={`${boton} text-muted-foreground opacity-50`}>Siguiente →</span>
        )}
      </span>
    </nav>
  );
}
