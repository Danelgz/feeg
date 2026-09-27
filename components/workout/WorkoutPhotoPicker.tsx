import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { getWorkoutTokens } from "../../lib/tokens";
import { compressImage, uploadImage, type ImageTransform } from "../../lib/imageUpload";
import { Icon } from "../ui";

export interface WorkoutPhotoState {
  /** Vista previa local (object URL) mientras sube, o la URL final. */
  preview: string | null;
  /** URL pública ya subida; es lo único que se guarda con el entreno. */
  url: string | null;
  status: "idle" | "uploading" | "done" | "error";
  error: string | null;
  /** Giro/espejo aplicado a mano; la vista previa lo muestra al instante con CSS. */
  transform: Required<ImageTransform>;
}

const NO_TRANSFORM: Required<ImageTransform> = { flip: false, rotate: 0 };
// Si el usuario volteó la última foto que hizo con la cámara, su móvil guarda los selfis en
// espejo: las siguientes se voltean solas. Se recuerda por dispositivo, no por cuenta.
const FLIP_KEY = "feeg.cameraPhotoFlip";
const readFlipPref = () => {
  try {
    return localStorage.getItem(FLIP_KEY) === "1";
  } catch {
    return false;
  }
};
const writeFlipPref = (on: boolean) => {
  try {
    localStorage.setItem(FLIP_KEY, on ? "1" : "0");
  } catch {
    /* modo privado: no se recuerda, sin más */
  }
};
const EMPTY: WorkoutPhotoState = { preview: null, url: null, status: "idle", error: null, transform: NO_TRANSFORM };

/**
 * Estado de la foto del entreno: se sube en cuanto se elige (no al pulsar "Guardar"), así cuando
 * el usuario termina de poner nombre y nota la foto ya está arriba y guardar es instantáneo.
 */
export function useWorkoutPhoto() {
  const [state, setState] = useState<WorkoutPhotoState>(EMPTY);
  const fileRef = useRef<Blob | null>(null);
  const localUrlRef = useRef<string | null>(null);
  // Cada subida lleva un número: si el usuario gira dos veces seguidas, sólo cuenta la última.
  const requestRef = useRef(0);
  const fromCameraRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const release = () => {
    if (localUrlRef.current) URL.revokeObjectURL(localUrlRef.current);
    localUrlRef.current = null;
  };
  useEffect(() => release, []);

  const upload = useCallback(async (file: Blob, transform: ImageTransform) => {
    const id = ++requestRef.current;
    setState((s) => ({ ...s, status: "uploading", error: null }));
    try {
      const compressed = await compressImage(file, 1440, 0.82, transform);
      const url = await uploadImage(compressed, "feeg/workouts");
      if (id === requestRef.current) setState((s) => ({ ...s, url, status: "done" }));
    } catch (e) {
      if (id === requestRef.current) setState((s) => ({ ...s, status: "error", error: e instanceof Error ? e.message : "No se pudo subir la foto." }));
    }
  }, []);

  const pick = useCallback(
    (file: File, source: "camera" | "gallery" = "gallery") => {
      if (!file.type.startsWith("image/")) {
        setState({ ...EMPTY, status: "error", error: "Ese archivo no es una imagen." });
        return;
      }
      release();
      const local = URL.createObjectURL(file);
      localUrlRef.current = local;
      fileRef.current = file;
      fromCameraRef.current = source === "camera";
      const initial = source === "camera" && readFlipPref() ? { ...NO_TRANSFORM, flip: true } : NO_TRANSFORM;
      setState({ preview: local, url: null, status: "uploading", error: null, transform: initial });
      upload(file, initial);
    },
    [upload]
  );

  const retry = useCallback(() => {
    if (fileRef.current) upload(fileRef.current, state.transform);
  }, [upload, state.transform]);

  /** Girar o voltear: la vista previa cambia ya; la versión corregida se sube tras una pausa. */
  const adjust = useCallback(
    (change: "flip" | "rotate") => {
      if (!fileRef.current) return;
      const next: Required<ImageTransform> =
        change === "flip"
          ? { ...state.transform, flip: !state.transform.flip }
          : { ...state.transform, rotate: (((state.transform.rotate + 90) % 360) as 0 | 90 | 180 | 270) };
      if (change === "flip" && fromCameraRef.current) writeFlipPref(next.flip);
      setState((s) => ({ ...s, transform: next, status: "uploading", url: null }));
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const file = fileRef.current;
      debounceRef.current = setTimeout(() => upload(file, next), 450);
    },
    [state.transform, upload]
  );

  const remove = useCallback(() => {
    release();
    fileRef.current = null;
    requestRef.current += 1;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setState(EMPTY);
  }, []);

  return { photo: state, pick, retry, remove, adjust };
}

interface WorkoutPhotoPickerProps {
  photo: WorkoutPhotoState;
  onPick: (file: File, source?: "camera" | "gallery") => void;
  onRetry: () => void;
  onRemove: () => void;
  onAdjust?: (change: "flip" | "rotate") => void;
}

/**
 * Foto del entreno en la pantalla de cierre: hacer una con la cámara o elegirla de la galería.
 * Se publica con el entreno y la ven tus seguidores en el feed y en tu perfil.
 */
export default function WorkoutPhotoPicker({ photo, onPick, onRetry, onRemove, onAdjust }: WorkoutPhotoPickerProps) {
  const tk = getWorkoutTokens();
  const reduceMotion = useReducedMotion();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const onChange = (source: "camera" | "gallery") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onPick(file, source);
    e.target.value = "";
  };

  const tile: React.CSSProperties = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 104,
    border: "none",
    borderRadius: 16,
    background: tk.surface,
    color: tk.text,
    fontWeight: 700,
    fontSize: "0.86rem",
    cursor: "pointer",
  };

  return (
    <section style={{ marginTop: 18 }} aria-label="Foto del entreno">
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ color: tk.text, fontWeight: 800, fontSize: "0.95rem" }}>Foto del entreno</span>
        <span style={{ color: tk.textFaint, fontSize: "0.74rem", fontWeight: 600 }}>La verán tus seguidores</span>
      </div>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={onChange("camera")} style={{ display: "none" }} />
      <input ref={galleryRef} type="file" accept="image/*" onChange={onChange("gallery")} style={{ display: "none" }} />

      <AnimatePresence mode="wait" initial={false}>
        {photo.preview ? (
          <motion.div
            key="preview"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            style={{ position: "relative", borderRadius: 18, overflow: "hidden", background: tk.surface, aspectRatio: "4 / 5", maxHeight: 420, margin: "0 auto" }}
          >
            <img
              src={photo.preview}
              alt="Foto del entreno"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                transform: `rotate(${photo.transform.rotate}deg) scaleX(${photo.transform.flip ? -1 : 1})`,
                transition: "transform .25s ease",
              }}
            />

            {photo.status === "uploading" && (
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(0,0,0,0.45)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderRadius: 99, background: "rgba(0,0,0,0.6)", color: "#fff", fontWeight: 700, fontSize: "0.84rem" }}>
                  <span className="feeg-photo-spinner" /> Subiendo foto…
                </div>
              </div>
            )}

            {photo.status === "error" && (
              <div style={{ position: "absolute", left: 12, right: 12, bottom: 12, display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 14, background: "rgba(0,0,0,0.75)", color: "#fff", fontSize: "0.8rem" }}>
                <Icon name="alertCircle" size={16} color={tk.warning} />
                <span style={{ flex: 1, minWidth: 0 }}>{photo.error}</span>
                <button type="button" onClick={onRetry} style={{ border: "none", borderRadius: 9, padding: "7px 10px", background: tk.accent, color: tk.onAccent, fontWeight: 800, fontSize: "0.76rem", cursor: "pointer" }}>
                  Reintentar
                </button>
              </div>
            )}

            {photo.status === "done" && (
              <span style={{ position: "absolute", left: 12, bottom: 12, display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 99, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: "0.74rem", fontWeight: 700 }}>
                <Icon name="check" size={13} color={tk.accent} strokeWidth={2.6} /> Lista para publicar
              </span>
            )}

            <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 8 }}>
              {onAdjust && (
                <>
                  <button type="button" onClick={() => onAdjust("flip")} aria-label="Voltear foto (quitar efecto espejo)" title="Voltear" style={{ ...overlayButton, background: photo.transform.flip ? tk.accent : overlayButton.background, color: photo.transform.flip ? tk.onAccent : "#fff" }}>
                    <Icon name="flip" size={16} />
                  </button>
                  <button type="button" onClick={() => onAdjust("rotate")} aria-label="Girar foto" title="Girar" style={overlayButton}>
                    <Icon name="rotate" size={16} />
                  </button>
                </>
              )}
              <button type="button" onClick={() => galleryRef.current?.click()} aria-label="Cambiar foto" style={overlayButton}>
                <Icon name="edit" size={15} />
              </button>
              <button type="button" onClick={onRemove} aria-label="Quitar foto" style={overlayButton}>
                <Icon name="trash" size={15} />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="empty" initial={false} animate={{ opacity: 1 }} exit={reduceMotion ? undefined : { opacity: 0 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="feeg-press" onClick={() => cameraRef.current?.click()} style={tile}>
                <span style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: tk.accentSoft, color: tk.accent }}>
                  <Icon name="camera" size={20} />
                </span>
                Hacer foto
              </button>
              <button type="button" className="feeg-press" onClick={() => galleryRef.current?.click()} style={tile}>
                <span style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: tk.surfaceAlt, color: tk.textMuted }}>
                  <Icon name="image" size={20} />
                </span>
                Subir de la galería
              </button>
            </div>
            {photo.status === "error" && photo.error && (
              <div style={{ marginTop: 8, color: tk.warning, fontSize: "0.8rem", fontWeight: 600 }}>{photo.error}</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .feeg-photo-spinner { width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; animation: feeg-photo-spin 0.8s linear infinite; }
        @keyframes feeg-photo-spin { to { transform: rotate(360deg); } }
      `}</style>
    </section>
  );
}

const overlayButton: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 10,
  border: "none",
  display: "grid",
  placeItems: "center",
  background: "rgba(0,0,0,0.55)",
  color: "#fff",
  cursor: "pointer",
  backdropFilter: "blur(6px)",
};
