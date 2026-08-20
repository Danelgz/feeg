import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { getTokens } from "../lib/tokens";
import { Icon } from "./ui";

type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

interface DockPosition {
  left: number;
  top: number;
  hidden: boolean;
  corner: Corner;
}

interface ActiveRoutineDockProps {
  activeRoutine: { id?: string | number; path?: string; name?: string };
  liveElapsed: number | null;
  isMobile: boolean;
  isDark: boolean;
  onContinue: () => void;
  onEnd: () => void;
  t: (key: string) => string;
}

const STORAGE_KEY = "activeRoutineDock";
const DOCK_WIDTH = 260;
const DOCK_HEIGHT = 132;
const EDGE_DISTANCE = 46;

function getDefaultPosition(): DockPosition {
  if (typeof window === "undefined") {
    return { left: 24, top: 24, hidden: false, corner: "bottom-right" };
  }
  return {
    left: Math.max(12, window.innerWidth - DOCK_WIDTH - 22),
    top: Math.max(12, window.innerHeight - DOCK_HEIGHT - 22),
    hidden: false,
    corner: "bottom-right",
  };
}

function readStoredPosition(): DockPosition {
  if (typeof window === "undefined") return getDefaultPosition();
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (stored && Number.isFinite(stored.left) && Number.isFinite(stored.top)) {
      return { ...getDefaultPosition(), ...stored };
    }
  } catch (_) {
    // Una preferencia corrupta no debe impedir que se pueda continuar el entrenamiento.
  }
  return getDefaultPosition();
}

function clampPosition(left: number, top: number) {
  if (typeof window === "undefined") return { left, top };
  return {
    left: Math.min(Math.max(8, left), Math.max(8, window.innerWidth - DOCK_WIDTH - 8)),
    top: Math.min(Math.max(8, top), Math.max(8, window.innerHeight - DOCK_HEIGHT - 8)),
  };
}

function getCorner(left: number, top: number): Corner | null {
  if (typeof window === "undefined") return null;
  const nearLeft = left <= EDGE_DISTANCE;
  const nearRight = left + DOCK_WIDTH >= window.innerWidth - EDGE_DISTANCE;
  const nearTop = top <= EDGE_DISTANCE;
  const nearBottom = top + DOCK_HEIGHT >= window.innerHeight - EDGE_DISTANCE;
  if (!nearTop && !nearBottom) return null;
  if (!nearLeft && !nearRight) return null;
  return `${nearTop ? "top" : "bottom"}-${nearLeft ? "left" : "right"}` as Corner;
}

function formatElapsed(seconds: number | null) {
  if (seconds === null) return null;
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remaining = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remaining}`;
}

export default function ActiveRoutineDock({
  activeRoutine,
  liveElapsed,
  isMobile,
  isDark,
  onContinue,
  onEnd,
  t,
}: ActiveRoutineDockProps) {
  const tk = getTokens(isDark);
  const [position, setPosition] = useState<DockPosition>(getDefaultPosition);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; left: number; top: number; moved: boolean } | null>(null);

  useEffect(() => {
    setPosition(readStoredPosition());
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
  }, [isHydrated, position]);

  useEffect(() => {
    const keepInsideViewport = () => {
      setPosition((current) => {
        if (current.hidden) return current;
        return { ...current, ...clampPosition(current.left, current.top) };
      });
    };
    window.addEventListener("resize", keepInsideViewport);
    return () => window.removeEventListener("resize", keepInsideViewport);
  }, []);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      left: position.left,
      top: position.top,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
    if (!drag.moved) return;
    const next = clampPosition(drag.left + dx, drag.top + dy);
    setPosition((current) => ({ ...current, ...next }));
  };

  const handlePointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    setIsDragging(false);
    if (!drag?.moved) return;

    const corner = getCorner(position.left, position.top);
    if (corner) setPosition((current) => ({ ...current, hidden: true, corner }));
  };

  const showDock = () => {
    const corner = position.corner;
    const left = corner.endsWith("left") ? 18 : Math.max(18, window.innerWidth - DOCK_WIDTH - 18);
    const top = corner.startsWith("top") ? 76 : Math.max(76, window.innerHeight - DOCK_HEIGHT - 76);
    setPosition({ ...position, ...clampPosition(left, top), hidden: false });
  };

  if (!activeRoutine || !isHydrated) return null;

  if (position.hidden) {
    const isLeft = position.corner.endsWith("left");
    const isTop = position.corner.startsWith("top");
    return (
      <button
        type="button"
        onClick={showDock}
        aria-label="Mostrar rutina en curso"
        title="Mostrar rutina en curso"
        className="feeg-press feeg-hover"
        style={{
          position: "fixed",
          zIndex: 3000,
          left: isLeft ? 0 : undefined,
          right: isLeft ? undefined : 0,
          top: isTop ? 76 : undefined,
          bottom: isTop ? undefined : isMobile ? 94 : 28,
          width: 30,
          height: 58,
          border: `1px solid ${tk.accent}`,
          borderLeft: isLeft ? "none" : `1px solid ${tk.accent}`,
          borderRight: isLeft ? `1px solid ${tk.accent}` : "none",
          borderRadius: isLeft ? "0 14px 14px 0" : "14px 0 0 14px",
          backgroundColor: tk.surface,
          color: tk.accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: tk.shadow.float,
          cursor: "pointer",
        }}
      >
        <Icon name={isLeft ? "chevronRight" : "chevronLeft"} size={18} />
      </button>
    );
  }

  return (
    <div
      role="region"
      aria-label="Rutina en curso"
      style={{
        position: "fixed",
        left: position.left,
        top: position.top,
        width: `min(${DOCK_WIDTH}px, calc(100vw - 24px))`,
        boxSizing: "border-box",
        zIndex: 3000,
        backgroundColor: tk.surface,
        border: `1px solid ${tk.accent}`,
        borderRadius: tk.radius.lg,
        padding: isMobile ? "12px" : "14px",
        boxShadow: tk.shadow.float,
        userSelect: "none",
      }}
    >
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ display: "flex", alignItems: "flex-start", gap: "8px", cursor: isDragging ? "grabbing" : "grab", touchAction: "none" }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: tk.accent, fontSize: tk.fontSize.xs, fontWeight: tk.weight.bold, display: "flex", alignItems: "center", gap: "6px" }}>
            <Icon name="dumbbell" size={13} />
            {t("active_routine_in_progress")}
            {formatElapsed(liveElapsed) && <span style={{ fontVariantNumeric: "tabular-nums" }}>· {formatElapsed(liveElapsed)}</span>}
          </div>
          <div style={{ color: tk.text, fontWeight: tk.weight.bold, fontSize: tk.fontSize.md, marginTop: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {activeRoutine.name}
          </div>
          <div style={{ color: tk.textFaint, fontSize: tk.fontSize.xs, marginTop: "4px" }}>Arrastra desde aquí · llévala a una esquina para ocultarla</div>
        </div>
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); setPosition((current) => ({ ...current, hidden: true, corner: "bottom-right" })); }}
          aria-label="Ocultar rutina en curso"
          title="Ocultar"
          className="feeg-surface feeg-press feeg-hover"
          style={{ border: "none", background: "transparent", color: tk.textMuted, cursor: "pointer", padding: "4px", display: "flex", borderRadius: tk.radius.sm, "--feeg-hover-fg": tk.accent } as React.CSSProperties}
        >
          <Icon name="eyeOff" size={15} />
        </button>
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); onEnd(); }}
          aria-label={t("delete_routine_short")}
          title={t("delete_routine_short")}
          className="feeg-surface feeg-press feeg-hover"
          style={{ border: "none", background: "transparent", color: tk.danger, cursor: "pointer", padding: "4px", display: "flex", borderRadius: tk.radius.sm, "--feeg-hover-fg": tk.dangerHover } as React.CSSProperties}
        >
          <Icon name="close" size={15} />
        </button>
      </div>
      <button
        type="button"
        onClick={onContinue}
        className="feeg-press feeg-hover"
        style={{ width: "100%", marginTop: "10px", border: "none", borderRadius: tk.radius.md, padding: "9px 12px", backgroundColor: tk.accent, color: tk.onAccent, fontWeight: tk.weight.bold, cursor: "pointer", transition: tk.transition, "--feeg-hover-bg": tk.accentHover, "--feeg-press-scale": 0.97 } as React.CSSProperties}
      >
        {t("continue_routine")}
      </button>
    </div>
  );
}
