import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cloudinaryThumb } from "../../lib/imageUpload";
import { Icon } from "../ui";

interface WorkoutPhotoProps {
  url: string;
  alt?: string;
  /** Ancho aproximado al que se pinta, para pedir a Cloudinary una miniatura de ese tamaño. */
  width?: number;
  radius?: number;
  /** Relación de aspecto del recorte en la tarjeta (la foto completa se ve al tocarla). */
  aspect?: string;
  maxHeight?: number | string;
}

/**
 * Foto de un entreno en el feed, el perfil o el resumen. Se recorta a 4:5 en la tarjeta (el
 * formato vertical de una foto de móvil sin que una panorámica ocupe media pantalla) y al tocarla
 * se abre entera a pantalla completa.
 */
export default function WorkoutPhoto({ url, alt = "Foto del entreno", width = 720, radius = 16, aspect = "4 / 5", maxHeight = 520 }: WorkoutPhotoProps) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label="Ver foto a pantalla completa"
        style={{
          display: "block",
          width: "100%",
          padding: 0,
          border: "none",
          borderRadius: radius,
          overflow: "hidden",
          aspectRatio: aspect,
          maxHeight,
          cursor: "zoom-in",
          background: "rgba(127,127,127,0.12)",
        }}
      >
        <img
          src={cloudinaryThumb(url, width * 2)}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: loaded ? 1 : 0, transition: "opacity .3s ease" }}
        />
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label={alt}
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                }}
                style={{ position: "fixed", inset: 0, zIndex: 7000, background: "rgba(0,0,0,0.94)", display: "grid", placeItems: "center", padding: 16, cursor: "zoom-out" }}
              >
                <motion.img
                  src={url}
                  alt={alt}
                  initial={reduceMotion ? false : { scale: 0.94 }}
                  animate={{ scale: 1 }}
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 12 }}
                />
                <button
                  type="button"
                  aria-label="Cerrar"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                  }}
                  style={{ position: "fixed", top: 16, right: 16, width: 40, height: 40, borderRadius: 99, border: "none", display: "grid", placeItems: "center", background: "rgba(255,255,255,0.14)", color: "#fff", cursor: "pointer" }}
                >
                  <Icon name="close" size={20} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
