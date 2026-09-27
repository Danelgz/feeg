import { useId, useMemo } from "react";
import { getTokens } from "../../lib/tokens";
import { Icon } from "../ui";

export interface Measure {
  id: string | number;
  date: string;
  weight?: string | number;
  height?: string | number;
  bodyFat?: string | number;
  waist?: string | number;
  chest?: string | number;
  bicepsR?: string | number;
  thighR?: string | number;
  hips?: string | number;
  photo?: string;
}

interface MeasuresDashboardProps {
  measures: Measure[];
  isDark: boolean;
  units: { weight: string; length: string };
  heightCm?: number | null;
  onOpen: (m: Measure) => void;
  onEdit: (m: Measure) => void;
  onDelete: (id: Measure["id"]) => void;
}

const num = (v: unknown) => {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
};
const fmt = (n: number, digits = 1) => n.toLocaleString("es-ES", { maximumFractionDigits: digits });

const METRICS: { key: keyof Measure; label: string; unit: "len" | "%" }[] = [
  { key: "bodyFat", label: "Grasa", unit: "%" },
  { key: "waist", label: "Cintura", unit: "len" },
  { key: "chest", label: "Pecho", unit: "len" },
  { key: "bicepsR", label: "Bíceps", unit: "len" },
  { key: "hips", label: "Cadera", unit: "len" },
  { key: "thighR", label: "Muslo", unit: "len" },
];

/**
 * Panel de Medidas: el peso actual como titular con su evolución dibujada, el resto de medidas con
 * cuánto han cambiado, y el historial como lista. Sustituye a cuatro tarjetas con borde que
 * enseñaban "--" cuando faltaba el dato y no decían si ibas a mejor o a peor.
 */
export default function MeasuresDashboard({ measures, isDark, units, heightCm, onOpen, onEdit, onDelete }: MeasuresDashboardProps) {
  const tk = getTokens(isDark);
  const gradId = `mw-${useId().replace(/:/g, "")}`;
  const sorted = useMemo(() => [...measures].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [measures]);
  const weights = sorted.map((m) => ({ date: m.date, v: num(m.weight) })).filter((p): p is { date: string; v: number } => p.v !== null);
  const latestW = weights[weights.length - 1];
  const prevW = weights[weights.length - 2];
  const firstW = weights[0];

  const heightM = (heightCm || num(sorted.map((m) => m.height).reverse().find((h) => num(h))) || 0) / 100;
  const bmi = latestW && heightM > 1 && units.weight === "kg" ? latestW.v / (heightM * heightM) : null;

  const metricRows = METRICS.map((m) => {
    const series = sorted.map((x) => num(x[m.key])).filter((v): v is number => v !== null);
    if (!series.length) return null;
    const last = series[series.length - 1];
    return { ...m, last, delta: series.length > 1 ? last - series[0] : null };
  }).filter(Boolean) as { key: string; label: string; unit: string; last: number; delta: number | null }[];

  // Gráfica de peso: línea de 2px con área tenue y punto final; sin ejes, las cifras van arriba.
  const W = 340;
  const H = 110;
  const pad = 8;
  let path = "";
  let area = "";
  let end: [number, number] | null = null;
  if (weights.length > 1) {
    const vals = weights.map((p) => p.v);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    const t0 = new Date(weights[0].date).getTime();
    const t1 = new Date(weights[weights.length - 1].date).getTime() || t0 + 1;
    const pts = weights.map((p) => [pad + ((new Date(p.date).getTime() - t0) / (t1 - t0 || 1)) * (W - pad * 2), pad + (1 - (p.v - min) / span) * (H - pad * 2)] as [number, number]);
    path = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
    area = `${path} L${pts[pts.length - 1][0].toFixed(1)},${H} L${pts[0][0].toFixed(1)},${H} Z`;
    end = pts[pts.length - 1];
  }

  const delta = (d: number | null, unit: string) =>
    d === null || Math.abs(d) < 0.05 ? (
      <span style={{ color: tk.textFaint }}>sin cambios</span>
    ) : (
      <span style={{ color: tk.textMuted, fontWeight: 700 }}>
        {d > 0 ? "▲" : "▼"} {fmt(Math.abs(d))} {unit}
      </span>
    );

  return (
    <div>
      {latestW ? (
        <section style={{ marginBottom: 18 }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: tk.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Peso actual</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
            <span style={{ fontSize: "3rem", fontWeight: 900, letterSpacing: "-0.03em", color: tk.text, lineHeight: 1 }}>{fmt(latestW.v)}</span>
            <span style={{ fontSize: "1.1rem", fontWeight: 700, color: tk.textMuted }}>{units.weight}</span>
            {bmi && (
              <span style={{ marginLeft: 4, padding: "3px 9px", borderRadius: 99, background: tk.hairline, color: tk.text, fontSize: "0.74rem", fontWeight: 800 }}>
                IMC {fmt(bmi)}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 6, fontSize: "0.8rem", flexWrap: "wrap" }}>
            {prevW && <span>{delta(latestW.v - prevW.v, units.weight)} <span style={{ color: tk.textFaint }}>vs anterior</span></span>}
            {firstW && firstW !== latestW && <span>{delta(latestW.v - firstW.v, units.weight)} <span style={{ color: tk.textFaint }}>desde el inicio</span></span>}
          </div>

          {path && end && (
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" role="img" aria-label={`Evolución del peso: ${weights.map((p) => fmt(p.v)).join(", ")} ${units.weight}`} style={{ display: "block", marginTop: 12, overflow: "visible" }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={tk.accent} stopOpacity="0.22" />
                  <stop offset="1" stopColor={tk.accent} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={area} fill={`url(#${gradId})`} />
              <path d={path} fill="none" stroke={tk.accent} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              <circle cx={end[0]} cy={end[1]} r={4} fill={tk.accent} stroke={tk.bg} strokeWidth={2} vectorEffect="non-scaling-stroke" />
            </svg>
          )}
          {weights.length > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: tk.textFaint, marginTop: 4 }}>
              <span>{new Date(weights[0].date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</span>
              <span>Hoy</span>
            </div>
          )}
        </section>
      ) : (
        <p style={{ margin: "0 0 18px", color: tk.textMuted, fontSize: "0.9rem", lineHeight: 1.5 }}>
          Registra tu peso para ver su evolución. También lo usan tus rangos de fuerza, que comparan lo que levantas con tu peso corporal.
        </p>
      )}

      {metricRows.length > 0 && (
        <section style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", borderTop: `1px solid ${tk.hairline}`, borderBottom: `1px solid ${tk.hairline}`, marginBottom: 22 }}>
          {metricRows.slice(0, 6).map((m, i) => (
            <div key={m.key} style={{ padding: "11px 0", paddingLeft: i % 3 ? 12 : 0, borderLeft: i % 3 ? `1px solid ${tk.hairline}` : "none", borderTop: i >= 3 ? `1px solid ${tk.hairline}` : "none", minWidth: 0 }}>
              <div style={{ fontSize: "0.7rem", color: tk.textMuted, fontWeight: 600 }}>{m.label}</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: tk.text, marginTop: 2 }}>
                {fmt(m.last)} <span style={{ fontSize: "0.72rem", color: tk.textFaint }}>{m.unit === "%" ? "%" : units.length}</span>
              </div>
              <div style={{ fontSize: "0.68rem", marginTop: 1 }}>{delta(m.delta, m.unit === "%" ? "%" : units.length)}</div>
            </div>
          ))}
        </section>
      )}

      <h2 style={{ margin: "0 0 6px", fontSize: "1.05rem", fontWeight: 800, color: tk.text }}>Historial</h2>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {[...sorted].reverse().map((m, i, arr) => {
          const w = num(m.weight);
          const older = arr.slice(i + 1).find((x) => num(x.weight));
          const d = w !== null && older ? w - (num(older.weight) as number) : null;
          const extra = METRICS.filter((x) => num(m[x.key])).length;
          const date = new Date(m.date);
          return (
            <li key={m.id} style={{ borderTop: `1px solid ${tk.hairline}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0" }}>
                <button type="button" onClick={() => onOpen(m)} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", color: tk.text }}>
                  {m.photo ? (
                    <img src={m.photo} alt="" style={{ width: 44, height: 48, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <span style={{ width: 44, height: 48, borderRadius: 12, background: tk.accentSoft, color: tk.accent, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0, lineHeight: 1 }}>
                      <span style={{ fontSize: "1.05rem", fontWeight: 900 }}>{date.getDate()}</span>
                      <span style={{ fontSize: "0.56rem", fontWeight: 800, marginTop: 3, textTransform: "uppercase" }}>{date.toLocaleDateString("es-ES", { month: "short" }).replace(".", "")}</span>
                    </span>
                  )}
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontWeight: 800, fontSize: "0.95rem" }}>
                      {w !== null ? `${fmt(w)} ${units.weight}` : "Sin peso"}
                      {d !== null && Math.abs(d) >= 0.05 && (
                        <span style={{ marginLeft: 8, fontSize: "0.76rem", fontWeight: 700, color: tk.textMuted }}>
                          {d > 0 ? "▲" : "▼"} {fmt(Math.abs(d))}
                        </span>
                      )}
                    </span>
                    <span style={{ display: "block", fontSize: "0.74rem", color: tk.textFaint, marginTop: 2 }}>
                      {date.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short", year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric" })}
                      {extra ? ` · ${extra} ${extra === 1 ? "medida" : "medidas"} más` : ""}
                    </span>
                  </span>
                </button>
                <button type="button" onClick={() => onEdit(m)} aria-label="Editar medida" className="feeg-press" style={iconBtn(tk)}>
                  <Icon name="edit" size={16} />
                </button>
                <button type="button" onClick={() => onDelete(m.id)} aria-label="Borrar medida" className="feeg-press" style={{ ...iconBtn(tk), color: tk.danger }}>
                  <Icon name="trash" size={16} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function iconBtn(tk: ReturnType<typeof getTokens>): React.CSSProperties {
  return { width: 34, height: 34, borderRadius: 10, border: "none", background: "none", color: tk.textMuted, display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0 };
}
