// Imagen para compartir un entreno (redes, WhatsApp): 1080×1350, el formato vertical que las redes
// muestran sin recortar. Con foto, la foto de fondo con un degradado; sin ella, un fondo oscuro con
// el brillo del color de la app. Se dibuja en un canvas en el propio móvil: nada sale del
// dispositivo salvo lo que el usuario decida compartir.

export interface ShareCardWorkout {
  name?: string;
  completedAt?: string;
  photoURL?: string;
  totalVolume?: number | string;
  series?: number;
  elapsedTime?: number;
  totalTime?: number;
  exerciseDetails?: { name?: string; series?: unknown[] }[];
}

const W = 1080;
const H = 1350;
const ACCENT = "#1dd1a1";
const FONT = "Outfit, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    // Cloudinary sirve con CORS abierto: sin crossOrigin el canvas quedaría "manchado" y no se
    // podría exportar.
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function minutesOf(w: ShareCardWorkout) {
  return w.elapsedTime !== undefined && w.elapsedTime !== null ? Math.round(Number(w.elapsedTime) / 60) : Number(w.totalTime || 0);
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t}…`;
}

export async function renderWorkoutCard(workout: ShareCardWorkout, headline = "Entreno completado"): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, W, H);

  const photo = workout.photoURL ? await loadImage(workout.photoURL) : null;
  if (photo) {
    // Recorte tipo "cover".
    const scale = Math.max(W / photo.naturalWidth, H / photo.naturalHeight);
    const dw = photo.naturalWidth * scale;
    const dh = photo.naturalHeight * scale;
    ctx.drawImage(photo, (W - dw) / 2, (H - dh) / 2, dw, dh);
    const g = ctx.createLinearGradient(0, H * 0.25, 0, H);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.55, "rgba(0,0,0,0.72)");
    g.addColorStop(1, "rgba(0,0,0,0.94)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const top = ctx.createLinearGradient(0, 0, 0, 220);
    top.addColorStop(0, "rgba(0,0,0,0.55)");
    top.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, W, 220);
  } else {
    const glow = ctx.createRadialGradient(W * 0.85, H * 0.1, 0, W * 0.85, H * 0.1, W);
    glow.addColorStop(0, "rgba(29,209,161,0.35)");
    glow.addColorStop(1, "rgba(29,209,161,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
  }

  const x = 80;
  ctx.textBaseline = "alphabetic";

  // Marca y fecha.
  ctx.fillStyle = ACCENT;
  ctx.font = `900 54px ${FONT}`;
  ctx.fillText("FEEG", x, 130);
  const date = workout.completedAt ? new Date(workout.completedAt) : new Date();
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = `600 36px ${FONT}`;
  ctx.textAlign = "right";
  ctx.fillText(date.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }), W - x, 128);
  ctx.textAlign = "left";

  // Bloque inferior: titular, nombre, cifras y ejercicios, de abajo hacia arriba.
  const exercises = (workout.exerciseDetails || []).filter((e) => e?.name).slice(0, 4);
  let y = H - 90;
  ctx.font = `600 38px ${FONT}`;
  for (let i = exercises.length - 1; i >= 0; i--) {
    const e = exercises[i];
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    const count = `${(e.series || []).length}×`;
    ctx.fillText(count, x, y);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillText(ellipsize(ctx, String(e.name).replace(/\s*\(.*\)$/, ""), W - x * 2 - 90), x + 80, y);
    y -= 56;
  }

  y -= 30;
  const vol = Math.round(Number(workout.totalVolume) || 0);
  const mins = minutesOf(workout);
  const stats = [
    { label: "DURACIÓN", value: mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min` },
    { label: "VOLUMEN", value: vol >= 1000 ? `${(vol / 1000).toLocaleString("es-ES", { maximumFractionDigits: 1 })} t` : `${vol} kg` },
    { label: "SERIES", value: String(workout.series || 0) },
  ];
  const colW = (W - x * 2) / 3;
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + 30);
  ctx.lineTo(W - x, y + 30);
  ctx.moveTo(x, y - 150);
  ctx.lineTo(W - x, y - 150);
  ctx.stroke();
  stats.forEach((s, i) => {
    const sx = x + colW * i + (i ? 28 : 0);
    if (i) {
      ctx.beginPath();
      ctx.moveTo(x + colW * i, y - 120);
      ctx.lineTo(x + colW * i, y);
      ctx.stroke();
    }
    ctx.fillStyle = "#fff";
    ctx.font = `900 64px ${FONT}`;
    ctx.fillText(ellipsize(ctx, s.value, colW - 36), sx, y - 44);
    ctx.fillStyle = ACCENT;
    ctx.font = `800 26px ${FONT}`;
    ctx.fillText(s.label, sx, y - 2);
  });

  y -= 200;
  ctx.fillStyle = "#fff";
  ctx.font = `900 92px ${FONT}`;
  ctx.fillText(ellipsize(ctx, workout.name || "Entreno", W - x * 2), x, y);
  ctx.fillStyle = ACCENT;
  ctx.font = `800 34px ${FONT}`;
  ctx.fillText(headline.toUpperCase(), x, y - 110);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

/** Comparte la imagen con la hoja del sistema; si el navegador no puede, la descarga. */
export async function shareWorkoutCard(workout: ShareCardWorkout, headline?: string, text?: string): Promise<"shared" | "downloaded" | "failed"> {
  const blob = await renderWorkoutCard(workout, headline);
  if (!blob) return "failed";
  const file = new File([blob], "feeg-entreno.png", { type: "image/png" });
  try {
    if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "FEEG", text });
      return "shared";
    }
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") return "shared";
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "feeg-entreno.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
