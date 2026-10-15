// Motor de sugerencia de precio (CLAUDE.md → Reglas de negocio):
// precio sugerido = f(costo puesto, margen objetivo de la categoría, mínimo/máximo/moda del mercado, rotación).
// Puro y sin acceso a datos. Siempre devuelve la explicación en texto. Nunca se aplica solo:
// en Precios el equipo toca "Usar" para aprobarlo.

import { COMISION_PAQUETERA, COSTO_ENVIO_FIJO, contribucion, precioConMargen, redondeoComercial, usd } from "@/lib/precios";
import { DESCUENTO_SIN_TARJETA } from "@/lib/tienda/formato";

export type Mercado = { min: number; max: number; moda: number; n: number };
export type Rotacion = "rapida" | "normal" | "lenta";
export type Sugerencia = { precio: number; contribucion: number; rotacion: Rotacion; explicacion: string[] };

/** Unidades vendidas en 30 días → rotación. */
export const rotacionDe = (unidades30: number): Rotacion => (unidades30 >= 5 ? "rapida" : unidades30 >= 1 ? "normal" : "lenta");

/** Precio más bajo que no pierde dinero aunque paguen en efectivo con 6% y sin cobrar envío. */
export function minimoSinPerdida(costo: number): number {
  return Math.ceil(((costo + COSTO_ENVIO_FIJO) / ((1 - COMISION_PAQUETERA) * (1 - DESCUENTO_SIN_TARJETA.porcentaje / 100))) * 100) / 100;
}

/** Redondeo comercial hacia ABAJO (para quedar por debajo del mercado): .99 bajo $30; 9 o 5 desde $30. */
export function redondeoAbajo(n: number): number {
  if (n < 30) return Math.max(0.99, Math.round((Math.floor(n + 0.01) - 0.01) * 100) / 100);
  const entero = Math.floor(n);
  const decena = Math.floor(entero / 10) * 10;
  return entero % 10 >= 9 ? decena + 9 : entero % 10 >= 5 ? decena + 5 : decena - 1;
}

/** Mínimo, máximo y precio más repetido (redondeado al dólar; si no se repite ninguno, la mediana). */
export function resumirMercado(precios: number[]): Mercado | null {
  const p = precios.filter((x) => x > 0).sort((a, b) => a - b);
  if (!p.length) return null;
  const cuenta = new Map<number, number>();
  for (const x of p) cuenta.set(Math.round(x), (cuenta.get(Math.round(x)) ?? 0) + 1);
  const [masRepetido, veces] = [...cuenta.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
  const mediana = p.length % 2 ? p[(p.length - 1) / 2] : (p[p.length / 2 - 1] + p[p.length / 2]) / 2;
  return { min: p[0], max: p[p.length - 1], moda: veces > 1 ? masRepetido : Math.round(mediana * 100) / 100, n: p.length };
}

export function sugerirPrecio(e: {
  costo: number;
  margenObjetivoPct: number;
  mercado: Mercado | null;
  unidades30: number;
}): Sugerencia {
  const { costo, margenObjetivoPct: m, mercado } = e;
  const rotacion = rotacionDe(e.unidades30);
  const piso = redondeoComercial(minimoSinPerdida(costo));
  const objetivo = precioConMargen(costo, m);
  const txt: string[] = [`Costo puesto ${usd(costo)}. Con tu margen objetivo de ${m}% el precio sería ${usd(objetivo)}.`];
  const vendidas = `${e.unidades30} ${e.unidades30 === 1 ? "unidad vendida" : "unidades vendidas"} en 30 días`;

  let precio: number;
  if (!mercado) {
    // Sin precios de mercado: margen objetivo, un poco más si se vende rápido y un poco menos si no se mueve
    if (rotacion === "rapida") {
      precio = precioConMargen(costo, m + 2);
      txt.push(`Se vende rápido (${vendidas}): se sube 2 puntos de margen.`);
    } else if (rotacion === "lenta") {
      precio = precioConMargen(costo, Math.max(m - 2, 1));
      txt.push(`No se vendió en 30 días: se baja 2 puntos de margen para moverlo.`);
    } else {
      precio = objetivo;
      txt.push(`Rotación normal (${vendidas}): se mantiene el margen objetivo.`);
    }
    txt.push("No hay precios de mercado anotados en los últimos 30 días: anotá algunos para afinar la sugerencia.");
  } else {
    const competitivo = redondeoAbajo(mercado.moda - 0.01);
    txt.push(
      mercado.n === 1
        ? `En el mercado se vio a ${usd(mercado.moda)} (1 precio anotado en 30 días).`
        : `En el mercado va de ${usd(mercado.min)} a ${usd(mercado.max)} y lo más común es ${usd(mercado.moda)} (${mercado.n} precios en 30 días).`
    );
    if (objetivo <= competitivo) {
      if (rotacion === "rapida") {
        precio = competitivo;
        txt.push(`Se vende rápido (${vendidas}) y el mercado está más alto: se sube hasta quedar justo debajo de lo más común.`);
      } else if (rotacion === "normal") {
        precio = Math.min(competitivo, redondeoComercial((objetivo + competitivo) / 2));
        txt.push(`Rotación normal (${vendidas}): a medio camino entre tu margen objetivo y el mercado.`);
      } else {
        precio = objetivo;
        txt.push(`No se vendió en 30 días: se queda en tu margen objetivo, que ya está debajo del mercado.`);
      }
    } else {
      precio = competitivo;
      txt.push(`Tu margen objetivo queda más caro que el mercado: se iguala justo debajo de lo más común para no perder ventas.`);
    }
  }

  if (precio < piso) {
    precio = piso;
    txt.push(`No baja de ${usd(piso)}: debajo de eso se pierde dinero con el 6% de efectivo y sin cobrar envío.`);
  }
  const contrib = contribucion(precio, costo);
  txt.push(`Sugerido ${usd(precio)}: deja ${usd(contrib)} de contribución por unidad (con envío de $5).`);
  return { precio, contribucion: contrib, rotacion, explicacion: txt };
}
