// Subida de imágenes a Cloudinary (preset sin firma, el mismo que usa la foto de perfil) con una
// compresión previa en el dispositivo. Una foto de móvil pesa 3-8 MB; reescalada a 1440px de lado
// y JPEG al 82% queda en ~250 KB: sube en un par de segundos con datos móviles y el feed no
// descarga megas por cada entreno.

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dfs9hazxo/image/upload";
const UPLOAD_PRESET = "feeg_profile";

export interface ImageTransform {
  /** Espejo horizontal: deshace el efecto espejo de muchos selfis de la cámara frontal. */
  flip?: boolean;
  /** Giro en grados, sentido horario. */
  rotate?: 0 | 90 | 180 | 270;
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/**
 * Reescala, reorienta y aplica el giro/espejo pedido, y devuelve un JPEG.
 *
 * Se decodifica con un <img> y no con `createImageBitmap(file)`: el <img> aplica siempre la
 * orientación EXIF de la cámara, mientras que createImageBitmap, según navegador y versión, la
 * ignora — y entonces una foto hecha con el móvil vertical salía tumbada o boca abajo.
 */
export async function compressImage(file: Blob, maxSide = 1440, quality = 0.82, transform: ImageTransform = {}): Promise<Blob> {
  if (typeof window === "undefined") return file;
  const hasTransform = !!transform.flip || !!transform.rotate;
  try {
    const img = await loadImage(file);
    const srcW = img.naturalWidth;
    const srcH = img.naturalHeight;
    const scale = Math.min(1, maxSide / Math.max(srcW, srcH));
    const w = Math.round(srcW * scale);
    const h = Math.round(srcH * scale);
    const quarter = transform.rotate === 90 || transform.rotate === 270;
    const canvas = document.createElement("canvas");
    canvas.width = quarter ? h : w;
    canvas.height = quarter ? w : h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    if (transform.rotate) ctx.rotate((transform.rotate * Math.PI) / 180);
    if (transform.flip) ctx.scale(-1, 1);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) return file;
    // Sin giro ni espejo, si la "comprimida" pesa más (una imagen ya pequeña) se sube la original.
    return hasTransform || blob.size < file.size ? blob : file;
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
