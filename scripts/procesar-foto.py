#!/usr/bin/env python3
"""Deja una foto de producto lista para la tienda, igual que las de public/productos:
fondo blanco, producto recortado y centrado, cuadrada de 1000 px y en WebP.

Uso:  python3 scripts/procesar-foto.py ORIGEN.png public/productos/<slug>/1.webp
Imprime el tamaño original; avisa (código 2) si la foto es demasiado chica (< 500 px).
"""
import sys
from pathlib import Path

from PIL import Image, ImageChops

LADO = 1000
MARGEN = 0.06  # aire alrededor del producto (6% por lado)
TOLERANCIA = 18  # cuánto puede alejarse del blanco un píxel para contarse como fondo


def a_fondo_blanco(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    blanco = Image.new("RGBA", im.size, (255, 255, 255, 255))
    blanco.alpha_composite(im)
    return blanco.convert("RGB")


def recortar_bordes(im: Image.Image) -> Image.Image:
    fondo = Image.new("RGB", im.size, (255, 255, 255))
    dif = ImageChops.difference(im, fondo).convert("L").point(lambda p: 255 if p > TOLERANCIA else 0)
    caja = dif.getbbox()
    return im.crop(caja) if caja else im


def procesar(origen: str, destino: str) -> int:
    im = Image.open(origen)
    im.load()
    ancho, alto = im.size
    im = recortar_bordes(a_fondo_blanco(im))
    util = int(LADO * (1 - 2 * MARGEN))
    escala = min(util / im.width, util / im.height)
    nuevo = im.resize((max(1, round(im.width * escala)), max(1, round(im.height * escala))), Image.LANCZOS)
    lienzo = Image.new("RGB", (LADO, LADO), (255, 255, 255))
    lienzo.paste(nuevo, ((LADO - nuevo.width) // 2, (LADO - nuevo.height) // 2))
    Path(destino).parent.mkdir(parents=True, exist_ok=True)
    lienzo.save(destino, "WEBP", quality=85, method=6)
    print(f"{origen}: original {ancho}x{alto} -> {destino}")
    return 2 if max(ancho, alto) < 500 else 0


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    sys.exit(procesar(sys.argv[1], sys.argv[2]))
