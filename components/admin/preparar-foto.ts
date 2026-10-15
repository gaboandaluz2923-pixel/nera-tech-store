"use client";

// Prepara una foto de producto en el navegador, igual que scripts/procesar-foto.py:
// (opcional) quita el fondo, pone fondo blanco, recorta los bordes vacíos, centra el producto
// con 6% de aire por lado y la guarda cuadrada en WebP. Gratis: todo corre en la computadora de quien sube.
//
// Quitar el fondo usa U2-Net (u2netp, licencia Apache 2.0) con onnxruntime-web 1.22.0 (MIT), servidos desde
// /modelos y /ort del propio sitio (sin servicios de terceros). Se descargan solo la primera vez que se usa (~16 MB).

const LADO = 1200;
const MARGEN = 0.06;
const TOLERANCIA = 18; // cuánto puede alejarse del blanco un píxel para contarse como fondo
const ENTRADA = 320; // tamaño que pide el modelo

type Ort = {
  env: { wasm: { wasmPaths: string; numThreads: number } };
  Tensor: new (tipo: string, datos: Float32Array, forma: number[]) => unknown;
  InferenceSession: {
    create: (url: string, opciones: unknown) => Promise<{
      inputNames: string[];
      outputNames: string[];
      run: (f: Record<string, unknown>) => Promise<Record<string, { data: Float32Array }>>;
    }>;
  };
};

let sesion: ReturnType<Ort["InferenceSession"]["create"]> | null = null;
let ortCargado: Ort | null = null;

async function modelo() {
  if (!sesion) {
    const url = "/ort/ort.wasm.min.mjs";
    sesion = (async () => {
      const ort = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url)) as Ort;
      ort.env.wasm.wasmPaths = "/ort/";
      ort.env.wasm.numThreads = 1; // sin hilos: no necesita encabezados especiales
      ortCargado = ort;
      return ort.InferenceSession.create("/modelos/u2netp.onnx", { executionProviders: ["wasm"] });
    })();
    sesion.catch(() => (sesion = null));
  }
  return sesion;
}

/** Máscara del producto (0 = fondo, 255 = producto) del tamaño del lienzo. */
async function mascara(lienzo: HTMLCanvasElement): Promise<HTMLCanvasElement> {
  const s = await modelo();
  const ort = ortCargado!;
  const chico = document.createElement("canvas");
  chico.width = ENTRADA;
  chico.height = ENTRADA;
  const c = chico.getContext("2d", { willReadFrequently: true })!;
  c.drawImage(lienzo, 0, 0, ENTRADA, ENTRADA);
  const px = c.getImageData(0, 0, ENTRADA, ENTRADA).data;
  const n = ENTRADA * ENTRADA;
  const datos = new Float32Array(3 * n);
  const media = [0.485, 0.456, 0.406];
  const desv = [0.229, 0.224, 0.225];
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 3; k++) datos[k * n + i] = (px[i * 4 + k] / 255 - media[k]) / desv[k];
  }
  const salida = await s.run({ [s.inputNames[0]]: new ort.Tensor("float32", datos, [1, 3, ENTRADA, ENTRADA]) });
  const m = salida[s.outputNames[0]].data;
  let min = Infinity;
  let max = -Infinity;
  for (const v of m) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const img = c.createImageData(ENTRADA, ENTRADA);
  for (let i = 0; i < n; i++) {
    const a = Math.round(((m[i] - min) / (max - min || 1)) * 255);
    img.data[i * 4 + 3] = a;
  }
  c.putImageData(img, 0, 0);
  const grande = document.createElement("canvas");
  grande.width = lienzo.width;
  grande.height = lienzo.height;
  const g = grande.getContext("2d")!;
  g.imageSmoothingQuality = "high";
  g.drawImage(chico, 0, 0, grande.width, grande.height);
  return grande;
}

/** Caja donde hay algo que no es blanco */
function cajaUtil(ctx: CanvasRenderingContext2D, ancho: number, alto: number) {
  const d = ctx.getImageData(0, 0, ancho, alto).data;
  let x0 = ancho;
  let y0 = alto;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const i = (y * ancho + x) * 4;
      if (255 - d[i] > TOLERANCIA || 255 - d[i + 1] > TOLERANCIA || 255 - d[i + 2] > TOLERANCIA) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? { x: 0, y: 0, w: ancho, h: alto } : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** Deja la foto lista para la tienda. `quitarFondo` usa el modelo (más lento la primera vez). */
export async function prepararFoto(archivo: File, quitarFondo: boolean): Promise<Blob> {
  const bitmap = await createImageBitmap(archivo);
  const escala = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const ancho = Math.max(1, Math.round(bitmap.width * escala));
  const alto = Math.max(1, Math.round(bitmap.height * escala));

  // 1. Sobre blanco (las PNG transparentes también quedan en blanco)
  const base = document.createElement("canvas");
  base.width = ancho;
  base.height = alto;
  const b = base.getContext("2d", { willReadFrequently: true })!;
  b.fillStyle = "#ffffff";
  b.fillRect(0, 0, ancho, alto);
  b.drawImage(bitmap, 0, 0, ancho, alto);
  bitmap.close();

  // 2. Quitar el fondo: el producto (según la máscara) sobre blanco
  if (quitarFondo) {
    const m = await mascara(base);
    const producto = document.createElement("canvas");
    producto.width = ancho;
    producto.height = alto;
    const p = producto.getContext("2d")!;
    p.drawImage(base, 0, 0);
    p.globalCompositeOperation = "destination-in";
    p.drawImage(m, 0, 0);
    b.fillStyle = "#ffffff";
    b.fillRect(0, 0, ancho, alto);
    b.drawImage(producto, 0, 0);
  }

  // 3. Recortar lo vacío y centrar en un cuadrado con aire alrededor
  const caja = cajaUtil(b, ancho, alto);
  const util = LADO * (1 - 2 * MARGEN);
  const f = Math.min(util / caja.w, util / caja.h);
  const w = Math.round(caja.w * f);
  const h = Math.round(caja.h * f);
  const final = document.createElement("canvas");
  final.width = LADO;
  final.height = LADO;
  const ctx = final.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, LADO, LADO);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(base, caja.x, caja.y, caja.w, caja.h, Math.round((LADO - w) / 2), Math.round((LADO - h) / 2), w, h);

  const webp = await new Promise<Blob | null>((ok) => final.toBlob(ok, "image/webp", 0.85));
  if (webp && webp.type === "image/webp") return webp;
  // Safari viejo no genera WebP: se usa JPG
  return (await new Promise<Blob | null>((ok) => final.toBlob(ok, "image/jpeg", 0.88)))!;
}

/** Para avisar antes: ¿la foto se ve muy chica? */
export async function ladoMayor(archivo: File) {
  const bm = await createImageBitmap(archivo);
  const lado = Math.max(bm.width, bm.height);
  bm.close();
  return lado;
}
