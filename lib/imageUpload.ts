// Subida de imágenes a Cloudinary (preset sin firma, el mismo que usa la foto de perfil) con una
// compresión previa en el dispositivo. Una foto de móvil pesa 3-8 MB; reescalada a 1440px de lado
// y JPEG al 82% queda en ~250 KB: sube en un par de segundos con datos móviles y el feed no
// descarga megas por cada entreno.

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dfs9hazxo/image/upload";
const UPLOAD_PRESET = "feeg_profile";

export async function compressImage(file: Blob, maxSide = 1440, quality = 0.82): Promise<Blob> {
  if (typeof window === "undefined" || typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    // Si por lo que sea la "comprimida" pesa más (una imagen ya pequeña), se sube la original.
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

/** Sube la imagen y devuelve su URL https pública. Lanza un Error con un mensaje legible. */
export async function uploadImage(file: Blob, folder?: string): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);
  if (folder) form.append("folder", folder);
  let response: Response;
  try {
    response = await fetch(CLOUDINARY_URL, { method: "POST", body: form });
  } catch {
    throw new Error("Sin conexión: no se pudo subir la foto.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.secure_url) {
    throw new Error(data?.error?.message ? `No se pudo subir la foto: ${data.error.message}` : "No se pudo subir la foto.");
  }
  return data.secure_url as string;
}

/**
 * URL de una miniatura servida por Cloudinary (recorte y formato automático) a partir de la URL
 * original. Para URLs que no son de Cloudinary devuelve la original tal cual.
 */
export function cloudinaryThumb(url: string, width: number): string {
  if (!url || !url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/c_fill,w_${Math.round(width)},q_auto,f_auto/`);
}
