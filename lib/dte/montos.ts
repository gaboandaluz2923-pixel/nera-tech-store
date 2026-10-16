// Redondeos de Hacienda (Manual funcional 2.0, XXI): 8 decimales en el cuerpo del documento,
// 2 en el resumen; 5 o más sube. La holgura permitida en el resumen es de un centavo.

const redondear = (n: number, decimales: number) => {
  const f = 10 ** decimales;
  // Number.EPSILON evita que 1.005 quede en 1.00 por la representación binaria
  const r = Math.round((Math.abs(n) + Number.EPSILON) * f) / f;
  return Math.sign(n) * r || 0;
};
export const r2 = (n: number) => redondear(n, 2);
export const r8 = (n: number) => redondear(n, 8);

const UNIDADES = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
const ESPECIALES = [
  "DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISÉIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE",
];
const VEINTES = [
  "VEINTE", "VEINTIUNO", "VEINTIDÓS", "VEINTITRÉS", "VEINTICUATRO", "VEINTICINCO", "VEINTISÉIS", "VEINTISIETE", "VEINTIOCHO", "VEINTINUEVE",
];
const DECENAS = ["", "", "", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
const CENTENAS = [
  "", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS",
];

function hasta999(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "CIEN";
  const c = Math.floor(n / 100);
  const resto = n % 100;
  let texto = CENTENAS[c];
  if (resto) {
    let r: string;
    if (resto < 10) r = UNIDADES[resto];
    else if (resto < 20) r = ESPECIALES[resto - 10];
    else if (resto < 30) r = VEINTES[resto - 20];
    else r = DECENAS[Math.floor(resto / 10)] + (resto % 10 ? ` Y ${UNIDADES[resto % 10]}` : "");
    texto = texto ? `${texto} ${r}` : r;
  }
  return texto;
}

/** Número entero en letras (hasta 999 999 999). */
export function enteroEnLetras(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return "CERO";
  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const partes: string[] = [];
  if (millones) partes.push(millones === 1 ? "UN MILLÓN" : `${hasta999(millones).replace(/UNO$/, "UN")} MILLONES`);
  if (miles) partes.push(miles === 1 ? "MIL" : `${hasta999(miles).replace(/UNO$/, "UN")} MIL`);
  if (resto) partes.push(hasta999(resto));
  return partes.join(" ");
}

/** "QUINIENTOS SESENTA 00/100 DÓLARES" */
export function montoEnLetras(monto: number): string {
  const total = r2(monto);
  const entero = Math.floor(total);
  const centavos = Math.round((total - entero) * 100);
  return `${enteroEnLetras(entero)} ${String(centavos).padStart(2, "0")}/100 DÓLARES`;
}
