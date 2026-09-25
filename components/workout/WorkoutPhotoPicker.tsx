import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { getWorkoutTokens } from "../../lib/tokens";
import { compressImage, uploadImage } from "../../lib/imageUpload";
import { Icon } from "../ui";

export interface WorkoutPhotoState {
  /** Vista previa local (object URL) mientras sube, o la URL final. */
  preview: string | null;
  /** URL pública ya subida; es lo único que se guarda con el entreno. */
  url: string | null;
  status: "idle" | "uploading" | "done" | "error";
  error: string | null;
}

const EMPTY: WorkoutPhotoState = { preview: null, url: null, status: "idle", error: null };

/**
 * Estado de la foto del entreno: se sube en cuanto se elige (no al pulsar "Guardar"), así cuando
 * el usuario termina de poner nombre y nota la foto ya está arriba y guardar es instantáneo.
 */
export function useWorkoutPhoto() {
  const [state, setState] = useState<WorkoutPhotoState>(EMPTY);
  const fileRef = useRef<Blob | null>(null);
  const localUrlRef = useRef<string | null>(null);

  const release = () => {
    if (localUrlRef.current) URL.revokeObjectURL(localUrlRef.current);
    localUrlRef.current = null;
  };
  useEffect(() => release, []);

  const upload = useCallback(async (file: Blob) => {
    setState((s) => ({ ...s, status: "uploading", error: null }));
    try {
      const compressed = await compressImage(file);
      const url = await uploadImage(compressed, "feeg/workouts");
      setState((s) => ({ ...s, url, status: "done" }));
    } catch (e) {
      setState((s) => ({ ...s, status: "error", error: e instanceof Error ? e.message : "No se pudo subir la foto." }));
    }
  }, []);

  const pick = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        setState({ ...EMPTY, status: "error", error: "Ese archivo no es una imagen." });
        return;
      }
      release();
      const local = URL.createObjectURL(file);
      localUrlRef.current = local;
      fileRef.current = file;
      setState({ preview: local, url: null, status: "uploading", error: null });
      upload(file);
    },
    [upload]
  );

  const retry = useCallback(() => {
    if (fileRef.current) upload(fileRef.current);
  }, [upload]);

  const remove = useCallback(() => {
    release();
    fileRef.current = null;
    setState(EMPTY);
  }, []);

  return { photo: state, pick, retry, remove };
}

interface WorkoutPhotoPickerProps {
  photo: WorkoutPhotoState;
  onPick: (file: File) => void;
  onRetry: () => void;
  onRemove: () => void;
}

/**
 * Foto del entreno en la pantalla de cierre: hacer una con la cámara o elegirla de la galería.
 * Se publica con el entreno y la ven tus seguidores en el feed y en tu perfil.
 */
export default function WorkoutPhotoPicker({ photo, onPick, onRetry, onRemove }: WorkoutPhotoPickerProps) {
  const tk = getWorkoutTokens();
  const reduceMotion = useReducedMotion();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onPick(file);
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

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={onChange} style={{ display: "none" }} />
      <input ref={galleryRef} type="file" accept="image/*" onChange={onChange} style={{ display: "none" }} />

      <AnimatePresence mode="wait" initial={false}>
        {photo.preview ? (
          <motion.div
            key="preview"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            style={{ position: "relative", borderRadius: 18, overflow: "hidden", background: tk.surface, aspectRatio: "4 / 5", maxHeight: 420, margin: "0 auto" }}
          >
            <img src={photo.preview} alt="Foto del entreno" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />

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
