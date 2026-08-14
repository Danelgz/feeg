import { useState } from "react";
import { slugify } from "../../lib/slug";
import { ExerciseThumb } from "../workout";

/**
 * Foto real del ejercicio si existe en `public/exercises/{slug}.jpg`, con el mismo patrón que
 * RankArt (components/ui/RankArt.tsx) para el arte de rango: intenta la imagen y cae al avatar de
 * iniciales+degradado (ExerciseThumb) si el archivo no está.
 *
 * A propósito no hay ninguna foto todavía — no existe una carpeta de fotografías reales de cada
 * ejercicio del catálogo (400+ nombres), y ExerciseThumb ya documenta que un intento anterior de
 * esto se revirtió por eso mismo. Esto deja el mecanismo listo (nombra el archivo así y aparece
 * solo, sin tocar código) para cuando haya presupuesto/fuente de fotos, en vez de fingir que ya
 * existen con una ruta que siempre da 404.
 */
export default function ExercisePhoto({ name, size = 96 }) {
  const [failed, setFailed] = useState(false);
  const src = `/exercises/${slugify(name)}.jpg`;

  if (failed) return <ExerciseThumb name={name} size={size} />;

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      style={{ width: size, height: size, borderRadius: "18px", objectFit: "cover", flexShrink: 0, display: "block" }}
    />
  );
}
