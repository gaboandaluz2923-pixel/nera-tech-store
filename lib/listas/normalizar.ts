// Normalizador de descripciones de listas de proveedores.
//
// Cada proveedor describe el mismo equipo distinto:
//   Maverik:   "Samsung Galaxy A276 A27 5G 6.7" (6+6)+128GB DS Negro"
//   Intcomex:  "GALAXY A27 6+128GB BLACK"
//   Idecom:    "SAMSUNG GALAXY A27 5G 8+256 GB BLUE"
//   Total Link:"INFINIX HOT 70 4+256GB NIGHT PULSE - MODEL X6895"
// Este módulo saca marca, modelo, RAM, almacenamiento y color, y arma una clave
// (marca|modelo|ram|almacenamiento|color) para emparejar entre proveedores.
// Es puro (sin dependencias) para poder probarlo y usarlo en navegador y servidor.

export type Interpretacion = {
  marca: string; // "Samsung"
  modelo: string; // "Galaxy A27"
  ramGb: number | null;
  almacenamientoGb: number | null;
  color: string | null; // canónico en español: "Negro"
  categoria: string; // slug de categoría sugerida
  claveProducto: string; // "samsung|galaxy a27"
  claveVariante: string; // "samsung|galaxy a27|6|128|negro"
  nombreProducto: string; // "Samsung Galaxy A27"
  nombreVariante: string; // "6 GB + 128 GB · Negro"
};

// ---------- utilidades ----------
export function sinAcentos(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

const SIGLAS = /^(fe|gt|xl|se|tws|bt|usb|lte|ai|tv|uhd|4k|wifi|jbl|zte|ap1|az1)$/i;

function titulo(s: string) {
  return s
    .split(" ")
    .filter(Boolean)
    .map((p) => {
      // Códigos con números (S24, A27, X8) y siglas (FE, GT, TWS) en mayúsculas
      if (/^iphone$/i.test(p)) return "iPhone";
      if (/^ipad$/i.test(p)) return "iPad";
      if (/\d/.test(p) || SIGLAS.test(p)) return p.toUpperCase();
      return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
    })
    .join(" ");
}

// ---------- marcas ----------
// Orden importa: la primera que coincida gana. "alias" son palabras que delatan la marca.
const MARCAS: { marca: string; alias: string[]; quitar: string[] }[] = [
  { marca: "Samsung", alias: ["samsung", "galaxy"], quitar: ["samsung"] },
  { marca: "Xiaomi", alias: ["xiaomi", "redmi", "poco"], quitar: ["xiaomi"] },
  { marca: "Infinix", alias: ["infinix", "nfinix"], quitar: ["infinix", "nfinix"] },
  { marca: "Itel", alias: ["itel"], quitar: ["itel"] },
  { marca: "Realme", alias: ["realme"], quitar: ["realme"] },
  { marca: "ZTE", alias: ["zte", "nubia"], quitar: ["zte"] },
  { marca: "Motorola", alias: ["motorola", "moto"], quitar: ["motorola"] },
  { marca: "Apple", alias: ["apple", "iphone", "ipad"], quitar: ["apple"] },
  { marca: "Honor", alias: ["honor"], quitar: ["honor"] },
  { marca: "Huawei", alias: ["huawei"], quitar: ["huawei"] },
  { marca: "JBL", alias: ["jbl"], quitar: ["jbl"] },
  { marca: "Klip Xtreme", alias: ["klipxtreme", "klip"], quitar: ["klipxtreme", "klip", "xtreme"] },
  { marca: "Anker", alias: ["anker"], quitar: ["anker"] },
  { marca: "Nintendo", alias: ["nintendo"], quitar: ["nintendo"] },
  { marca: "Wiko", alias: ["wiko"], quitar: ["wiko"] },
  { marca: "Vimoq", alias: ["vimoq"], quitar: ["vimoq"] },
  { marca: "Zizo", alias: ["zizo"], quitar: ["zizo"] },
  { marca: "Prodigee", alias: ["prodigee"], quitar: ["prodigee"] },
  { marca: "Nautica", alias: ["nautica"], quitar: ["nautica"] },
];

// ---------- colores ----------
// Se busca la primera palabra base reconocible dentro del texto de color.
const COLORES: [RegExp, string][] = [
  [/\b(light blue|celeste|sky blue)\b/, "Celeste"],
  [/\b(black|negro|midnight|abyss|onyx)\b/, "Negro"],
  [/\b(white|blanco|swan|starlight)\b/, "Blanco"],
  [/\b(blue|azul|ocean|navy|blueberry)\b/, "Azul"],
  [/\b(green|verde|mint)\b/, "Verde"],
  [/\b(violet|violeta|purple|morado|lila|peony)\b/, "Violeta"],
  [/\b(pink|rosado|rosa|rose|coral)\b/, "Rosado"],
  [/\b(red|rojo|bordeaux)\b/, "Rojo"],
  [/\b(orange|naranja)\b/, "Naranja"],
  [/\b(gold|dorado|beige)\b/, "Dorado"],
  [/\b(silver|plateado|plata|glacier)\b/, "Plateado"],
  [/\b(gray|grey|gris|graphite)\b/, "Gris"],
  [/\b(titanium|titanio|titaniun)\b/, "Titanio"],
  [/\b(brown|cafe|mocha)\b/, "Café"],
  [/\b(yellow|amarillo)\b/, "Amarillo"],
  [/\b(cyan)\b/, "Celeste"],
  [/\b(multicolor)\b/, "Multicolor"],
];

const MODIFICADORES_COLOR = new Set([
  "light", "dark", "deep", "sky", "matte", "steel", "sunset", "pomelo", "celestial",
  "shadow", "cobalt", "cobal", "titanium", "space", "jet", "pure",
]);

function colorCanonico(texto: string): string | null {
  const t = sinAcentos(texto.toLowerCase());
  for (const [re, nombre] of COLORES) if (re.test(t)) return nombre;
  const limpio = t.trim();
  return limpio ? titulo(limpio) : null;
}

// ---------- categoría ----------
function categoriaSugerida(t: string, tieneMemoria: boolean): string {
  if (/\b(tv|smart tv)\b/.test(t)) return "otros";
  // Sin memoria: cámaras (Insta360 y sus accesorios, cámaras de seguridad), estaciones de energía y paneles
  // solares (EcoFlow), y powerbanks (van con cargadores)
  if (!tieneMemoria && /\b(insta360|nsta360|gopro|dashcam|solocam|doorbell|floodlight cam|camara|camera)\b/.test(t)) return "camaras";
  if (!tieneMemoria && /\b(ecoflow|bluetti|jackery|power ?station|solar panel|panel solar|paneles solares|estacion de energia)\b/.test(t))
    return "energia";
  if (!tieneMemoria && /\b(power ?bank|powerbank|powercore|bateria externa)\b/.test(t)) return "cargadores";
  // "Charging station 3-in-1 pad" es un cargador, no una tablet
  if (/\b(charger|charging|cargador|magsafe|maggo)\b/.test(t) && !tieneMemoria) return "cargadores";
  if (/\b(tab|pad|tablet|xpad)\b/.test(t)) return "tablets";
  if (/\b(watch|wacht|xwatch|smartwatch|band|reloj)\b/.test(t)) return "relojes";
  if (/\b(buds|earbuds|xbuds|earphones?|headphones?|nanophones|audifonos|freebuds|tune|auriculares)\b/.test(t))
    return "audifonos";
  if (/\b(speaker|bocina|musicbox|go4|grip|parlante)\b/.test(t)) return "bocinas";
  if (/\b(charger|charging|cargador|adaptador|adapter|cable)\b/.test(t)) return "cargadores";
  if (/\b(case|funda|protector|mica|vidrio)\b/.test(t)) return "proteccion";
  if (/\b(consola|console|switch|camera|tag|pencil)\b/.test(t)) return "otros";
  return tieneMemoria ? "celulares" : "otros";
}

// ---------- memoria ----------
// Formatos vistos: "(6+6)+128GB", "(4+10)+256GB", "8+256GB", "8+256 GB", "16+1TB",
// "4+64GB", "12+512 GB", "128GB" (solo almacenamiento, ej. iPhone)
const RE_MEM_VIRTUAL = /\(\s*(\d+)\s*\+\s*\d+\s*\)\s*\+\s*(\d+)\s*(gb|tb)\b/i;
const RE_MEM = /\b(\d{1,2})\s*\+\s*(\d{2,4}|1|2)\s*(gb|tb)\b/i;
const RE_MEM_SOLO = /\b(\d{2,4}|1|2)\s*(gb|tb)\b/i;

function aGb(n: string, unidad: string) {
  return unidad.toLowerCase() === "tb" ? Number(n) * 1024 : Number(n);
}

// ---------- ruido que no forma parte del modelo ----------
const RUIDO = new Set([
  "ds", "ss", "s", "4g", "5g", "lte", "dual", "sim", "model", "modelo", "new", "nuevo",
  "gsm", "cdma", "phone", "smartphone", "celular", "us", "b", "jp", "inv",
]);

function quitarCodigos(tokens: string[], marca: string): string[] {
  return tokens.filter((tk) => {
    if (RUIDO.has(tk)) return false;
    if (/^\d+(\.\d+)?("|”|pulg|in)?$/.test(tk) && tk.includes(".")) return false; // 6.7"
    if (/^\d+(\.\d+)?["”]$/.test(tk)) return false;
    if (/^sm-/.test(tk)) return false;
    if (marca === "Samsung" && /^[as]\d{3}[mbfu]?$/.test(tk)) return false; // A276, A065M, S721B
    if (marca === "Infinix" && /^x\d{4}[a-z]?$/.test(tk)) return false; // X6895, X6895B
    if (marca === "Itel" && /^[ap]\d{3,5}l$/.test(tk)) return false; // A6611L, P10005L
    if (marca === "Realme" && /^rmx\d+$/.test(tk)) return false;
    if (/^\d{10,}$/.test(tk)) return false; // códigos de barras
    return true;
  });
}

export function interpretar(descripcionOriginal: string): Interpretacion {
  // 1) Limpieza básica
  let t = sinAcentos(descripcionOriginal.toLowerCase())
    .replace(/new!+/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  // "- MODEL X6895" y "(Grey)" al final de Total Link: el código no es parte del modelo
  t = t.replace(/\s*-\s*model\s+[a-z0-9]+.*$/i, "").replace(/\s*-\s*rmx\d+.*$/i, "");
  t = t.replace(/\s-\s*euro charger/i, "");

  // 2) Marca
  const tokensTodos = t.split(/[\s/]+/);
  const def = MARCAS.find((m) => m.alias.some((a) => tokensTodos.includes(a)));
  const marca = def?.marca ?? titulo(tokensTodos[0] ?? "Otro");

  // 3) Memoria y división modelo | color
  let ramGb: number | null = null;
  let almacenamientoGb: number | null = null;
  let antes = t;
  let despues = "";

  const mv = RE_MEM_VIRTUAL.exec(t);
  const m = mv ? null : RE_MEM.exec(t);
  const ms = mv || m ? null : RE_MEM_SOLO.exec(t);
  const encontrado = mv ?? m ?? ms;
  if (mv) {
    ramGb = Number(mv[1]);
    almacenamientoGb = aGb(mv[2], mv[3]);
  } else if (m) {
    ramGb = Number(m[1]);
    almacenamientoGb = aGb(m[2], m[3]);
  } else if (ms) {
    almacenamientoGb = aGb(ms[1], ms[2]);
  }
  if (encontrado) {
    antes = t.slice(0, encontrado.index);
    despues = t.slice(encontrado.index + encontrado[0].length);
  }

  const categoria = categoriaSugerida(t, almacenamientoGb !== null);

  // En audífonos, el conector ("USB-C", "Type-C") describe el modelo, no lo distingue:
  // "JBL TUNE 310C USB-C RED" y "JBL TUNE 310C BLACK USB-C" son el mismo producto en dos colores.
  if (categoria === "audifonos" && !encontrado) {
    antes = antes.replace(/\b(usb|type)[\s-]?c\b/g, " ").replace(/\s+/g, " ").trim();
  }

  // 4) Modelo: lo que está antes de la memoria, sin marca, códigos ni ruido
  // Marca conocida: se quitan sus alias. Marca que no conozco (Kieslect, Ecoflow, Insta360…): se toma la primera
  // palabra como marca y se quita del modelo, para no armar "Kieslect Kieslect Calling Watch".
  const quitarMarca = new Set(def?.quitar ?? [tokensTodos[0]]);
  let tokensModelo = antes
    .replace(/[(),]/g, " ")
    .split(/[\s/-]+/)
    .filter(Boolean)
    .filter((tk) => !quitarMarca.has(tk));
  tokensModelo = quitarCodigos(tokensModelo, marca);

  // 5) Color: lo que está después de la memoria (o, sin memoria, las últimas palabras de color)
  let color: string | null = null;
  if (encontrado) {
    const tokensColor = despues
      .replace(/[(),-]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .filter((tk) => !RUIDO.has(tk) && !/^\d+\.?\d*["”]?$/.test(tk) && !/^(wifi|lte|4g|5g)$/.test(tk));
    // "wifi" / "lte" después de la memoria (tablets) son parte del modelo
    if (/\bwifi\b/.test(despues)) tokensModelo.push("wifi");
    color = tokensColor.length ? colorCanonico(tokensColor.join(" ")) : null;
  } else {
    // Accesorios: quitar del final solo palabras de color y sus modificadores ("light blue", "matte silver")
    const esPalabraColor = (tk: string) => COLORES.some(([re]) => re.test(tk));
    let quitar = 0;
    while (
      quitar < tokensModelo.length - 1 &&
      esPalabraColor(tokensModelo[tokensModelo.length - 1 - quitar])
    )
      quitar++;
    if (quitar > 0) {
      while (
        quitar < tokensModelo.length - 1 &&
        MODIFICADORES_COLOR.has(tokensModelo[tokensModelo.length - 1 - quitar])
      )
        quitar++;
      color = colorCanonico(tokensModelo.slice(-quitar).join(" "));
      tokensModelo = tokensModelo.slice(0, -quitar);
    }
  }

  const modeloTexto = tokensModelo.join(" ").trim() || "sin modelo";
  const modelo = titulo(modeloTexto);
  const marcaClave = sinAcentos(marca.toLowerCase());
  const claveProducto = `${marcaClave}|${modeloTexto}`;
  const claveVariante = [
    claveProducto,
    ramGb ?? "-",
    almacenamientoGb ?? "-",
    color ? sinAcentos(color.toLowerCase()) : "-",
  ].join("|");

  const mem =
    almacenamientoGb === null
      ? null
      : ramGb === null
        ? formatoAlmacenamiento(almacenamientoGb)
        : `${ramGb} GB + ${formatoAlmacenamiento(almacenamientoGb)}`;
  const nombreVariante = [mem, color].filter(Boolean).join(" · ") || "Único";

  return {
    marca,
    modelo,
    ramGb,
    almacenamientoGb,
    color,
    categoria,
    claveProducto,
    claveVariante,
    nombreProducto: `${marca} ${modelo}`,
    nombreVariante,
  };
}

/**
 * Nombre del producto corregido a mano (Emparejar): la marca, el modelo y la clave salen del nombre nuevo,
 * la memoria y el color siguen siendo los de la línea. Si el nombre no cambió, queda igual.
 * Así "Hot Hot 70" corregido a "Infinix Hot 70" se une al producto Infinix Hot 70 si ya existe.
 */
export function conNombre(i: Interpretacion, nombre: string | null | undefined): Interpretacion {
  const limpio = (nombre ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  if (!limpio || limpio === i.nombreProducto) return i;
  const j = interpretar(limpio);
  const claveProducto = j.claveProducto;
  const claveVariante = [claveProducto, i.ramGb ?? "-", i.almacenamientoGb ?? "-", i.color ? sinAcentos(i.color.toLowerCase()) : "-"].join("|");
  return { ...i, marca: j.marca, modelo: j.modelo, claveProducto, claveVariante, nombreProducto: limpio };
}

/**
 * Clave con la marca repetida al inicio del modelo ("coolpad|coolpad cp12 neo k18"), como se guardaba antes
 * para marcas desconocidas → "coolpad|cp12 neo k18". Sirve para encontrar esos productos viejos.
 */
export function claveSinMarcaRepetida(clave: string | null | undefined) {
  if (!clave) return "";
  const [marca, modelo, ...resto] = clave.split("|");
  if (!marca || !modelo?.startsWith(`${marca} `)) return clave;
  return [marca, modelo.slice(marca.length + 1), ...resto].join("|");
}

export function formatoAlmacenamiento(gb: number) {
  return gb >= 1024 && gb % 1024 === 0 ? `${gb / 1024} TB` : `${gb} GB`;
}

// Clave de configuración (sin color): sirve para comparar precios entre proveedores
export function claveConfiguracion(i: Pick<Interpretacion, "claveProducto" | "ramGb" | "almacenamientoGb">) {
  return `${i.claveProducto}|${i.ramGb ?? "-"}|${i.almacenamientoGb ?? "-"}`;
}

export function slugDe(texto: string) {
  return sinAcentos(texto.toLowerCase())
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
