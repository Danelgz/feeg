// Prepara el arte de los rangos: quita el fondo, recorta el margen y deja las imágenes cuadradas.
//
//   node scripts/prepare-rank-art.mjs
//
// Trabaja sobre public/ranks/*.png y guarda los originales intactos en scripts/.rank-art-backup/,
// así que se puede ejecutar las veces que haga falta sin perder nada.
//
// Resuelve de una vez los tres problemas del arte generado por IA:
//
//   1. FONDO BLANCO → transparente. No basta con volver transparente todo lo que sea casi blanco:
//      las insignias plateadas tienen brillos igual de claros y quedarían agujereadas. Se hace un
//      relleno por inundación DESDE LOS BORDES, que sólo alcanza el blanco conectado con el
//      exterior y deja intacto el interior de la figura.
//   2. MARGEN ENORME. El lienzo es 1024×1536 y la insignia ocupa un tercio, así que al encajarla en
//      su hueco se ve diminuta. Tras limpiar el fondo se recorta al contenido real.
//   3. PROPORCIÓN Y PESO. Se centra en un cuadrado de 256×256 con fondo transparente — el tamaño
//      mayor en que se dibujan es 68px, así que 256 cubre retina de sobra y pesa una fracción.

import { mkdirSync, readdirSync, existsSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const DIR = join(process.cwd(), 'public', 'ranks');
// Fuera de public/ a propósito: los originales pesan 30× más y no deben acabar desplegados.
const BACKUP = join(process.cwd(), 'scripts', '.rank-art-backup');
const OUT_SIZE = 256;
// Por encima de esto, un píxel del borde se considera fondo. 236 deja pasar el blanco roto y las
// sombras suaves del generador sin comerse los brillos metálicos, que van acompañados de color.
const WHITE = 236;

/** Vuelve transparente el fondo conectado con los bordes, sin tocar el interior de la figura. */
function clearBackground(data, width, height) {
  const seen = new Uint8Array(width * height);
  const stack = [];

  const isBackground = (idx) => {
    const p = idx * 4;
    // Ya transparente, o casi blanco.
    return data[p + 3] < 16 || (data[p] >= WHITE && data[p + 1] >= WHITE && data[p + 2] >= WHITE);
  };

  for (let x = 0; x < width; x++) {
    stack.push(x, (height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    stack.push(y * width, y * width + width - 1);
  }

  while (stack.length) {
    const idx = stack.pop();
    if (seen[idx] || !isBackground(idx)) continue;
    seen[idx] = 1;
    data[idx * 4 + 3] = 0;

    const x = idx % width;
    const y = (idx - x) / width;
    if (x > 0) stack.push(idx - 1);
    if (x < width - 1) stack.push(idx + 1);
    if (y > 0) stack.push(idx - width);
    if (y < height - 1) stack.push(idx + width);
  }
}

const files = existsSync(DIR) ? readdirSync(DIR).filter((f) => f.toLowerCase().endsWith('.png')) : [];

if (files.length === 0) {
  console.log(`\n  No hay ningún PNG en ${DIR}\n`);
  process.exit(0);
}

mkdirSync(BACKUP, { recursive: true });
console.log(`\n  Procesando ${files.length} imagen(es)...\n`);

let done = 0;
for (const name of files) {
  const path = join(DIR, name);
  const backup = join(BACKUP, name);

  try {
    // El original sólo se copia la primera vez: si el script se repite, la copia de seguridad sigue
    // siendo la imagen tal cual llegó y no una ya procesada.
    if (!existsSync(backup)) copyFileSync(path, backup);

    const source = sharp(backup).ensureAlpha();
    const { data, info } = await source.raw().toBuffer({ resolveWithObject: true });

    clearBackground(data, info.width, info.height);

    const cleaned = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
      .png()
      .toBuffer();

    const trimmed = await sharp(cleaned).trim({ threshold: 1 }).toBuffer();
    const meta = await sharp(trimmed).metadata();

    await sharp(trimmed)
      .resize(OUT_SIZE, OUT_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toFile(path);

    console.log(`    ok  ${name}  ${info.width}×${info.height} → recorte ${meta.width}×${meta.height} → ${OUT_SIZE}×${OUT_SIZE}`);
    done++;
  } catch (error) {
    console.log(`    !!  ${name}: ${error.message}`);
  }
}

console.log(`\n  ${done} de ${files.length} listas. Originales en scripts/.rank-art-backup/\n`);
