import { getTokens } from "../../lib/tokens";
import { cloudinaryThumb } from "../../lib/imageUpload";
import { Icon } from "../ui";

interface PhotoWorkout {
  id: string | number;
  name?: string;
  photoURL?: string;
  completedAt?: string;
}

interface ProfilePhotoGridProps {
  workouts: PhotoWorkout[];
  isDark: boolean;
  onOpenWorkout: (workout: PhotoWorkout) => void;
  emptyHint?: string;
}

/**
 * Pestaña "Fotos" del perfil: las fotos de los entrenos en rejilla de 3, la más reciente primero.
 * Cada foto abre su entreno (la foto es la portada, no un álbum aparte).
 */
export default function ProfilePhotoGrid({ workouts, isDark, onOpenWorkout, emptyHint }: ProfilePhotoGridProps) {
  const tk = getTokens(isDark);
  const withPhoto = workouts
    .filter((w) => w.photoURL)
    .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());

  if (withPhoto.length === 0) {
    return (
      <div style={{ padding: "36px 12px", textAlign: "center", color: tk.textMuted }}>
        <span style={{ display: "inline-grid", placeItems: "center", width: 52, height: 52, borderRadius: 16, background: tk.hairline, color: tk.textFaint, marginBottom: 10 }}>
          <Icon name="camera" size={22} />
        </span>
        <div style={{ fontWeight: 800, color: tk.text, fontSize: "0.95rem" }}>Aún no hay fotos</div>
        <div style={{ fontSize: "0.82rem", marginTop: 4, lineHeight: 1.45 }}>{emptyHint || "Las fotos de los entrenos aparecerán aquí."}</div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 3, borderRadius: 14, overflow: "hidden" }}>
      {withPhoto.map((w) => (
        <button
          key={w.id}
          type="button"
          onClick={() => onOpenWorkout(w)}
          aria-label={`Ver ${w.name || "entreno"}`}
          className="feeg-press"
          style={{ position: "relative", aspectRatio: "4 / 5", padding: 0, border: "none", background: tk.surface, cursor: "pointer", overflow: "hidden" }}
        >
          <img src={cloudinaryThumb(w.photoURL as string, 300)} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "18px 7px 6px", background: "linear-gradient(transparent, rgba(0,0,0,0.65))", color: "#fff", fontSize: "0.66rem", fontWeight: 700, textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {w.name}
          </span>
        </button>
      ))}
    </div>
  );
}
