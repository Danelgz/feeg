import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";
import { useRanks } from "../hooks/useRanks";
import { getRankPosition, RANKS } from "../data/ranks";
import { STRENGTH_STANDARDS } from "../data/strengthStandards";
import { resolveStandard, nextLevelTarget } from "../lib/rankEngine";
import { getExerciseInfo, computePersonalRecords, computePRTimeline } from "../lib/exerciseStats";
import { getExerciseSessions, computeRepRecordsWithDates, computeSessionFrequency } from "../lib/exerciseProfile";
import { translateExerciseName } from "../lib/exerciseTranslation";
import { getTokens } from "../lib/tokens";
import { Icon, Badge, EmptyState, ChipNav, RankArt, Spinner } from "../components/ui";
import ExercisePhoto from "../components/exerciseProfile/ExercisePhoto";
import ExerciseProgressChart from "../components/exerciseProfile/ExerciseProgressChart";
import ReadOnlyWorkoutModal from "../components/workout/ReadOnlyWorkoutModal";

const RANK_SCALE = `linear-gradient(90deg, ${RANKS.map((r) => r.color).join(", ")})`;

const TABS = [
  { key: "resumen", label: "Resumen" },
  { key: "records", label: "Récords" },
  { key: "historial", label: "Historial" },
  { key: "notas", label: "Notas" },
];

function formatDate(date) {
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

export default function ExerciseHistoryPage() {
  const router = useRouter();
  const { theme, isMobile, t, language, completedWorkouts, exerciseNotes, saveExerciseNote, favoriteExercises, toggleFavoriteExercise } = useUser();
  const { exerciseRanks, bodyweightKg, sex } = useRanks();
  const isDark = theme === "dark";
  const tk = getTokens(isDark);

  const exerciseName = router.query.exercise;
  const [activeTab, setActiveTab] = useState("resumen");
  const [viewingWorkout, setViewingWorkout] = useState(null);
  const [noteDraft, setNoteDraft] = useState(null);
  const [noteSaved, setNoteSaved] = useState(false);

  const info = exerciseName ? getExerciseInfo(exerciseName) : null;
  const unit = info?.type === "time" ? "m" : info?.unit === "lastre" ? "L" : "kg";
  const isFavorite = exerciseName ? favoriteExercises.includes(exerciseName) : false;

  const sessions = useMemo(
    () => (exerciseName ? getExerciseSessions(completedWorkouts, exerciseName) : []),
    [completedWorkouts, exerciseName]
  );

  const prMap = useMemo(() => computePersonalRecords(completedWorkouts), [completedWorkouts]);
  const record = exerciseName ? prMap[exerciseName] : null;

  const repRecords = useMemo(
    () => (exerciseName ? computeRepRecordsWithDates(completedWorkouts, exerciseName) : []),
    [completedWorkouts, exerciseName]
  );

  const prTimeline = useMemo(() => {
    if (!exerciseName) return [];
    return computePRTimeline(completedWorkouts, 2000).milestones.filter((m) => m.exerciseName === exerciseName);
  }, [completedWorkouts, exerciseName]);

  const frequency = useMemo(() => computeSessionFrequency(sessions), [sessions]);

  const rank = exerciseName ? exerciseRanks.find((r) => r.exercise === exerciseName) : null;
  const rankPosition = rank ? getRankPosition(rank.level) : null;
  const rankTarget = rank ? nextLevelTarget(exerciseName, rank.level, rank.best1RM, bodyweightKg, sex) : null;

  const standard = exerciseName ? STRENGTH_STANDARDS[exerciseName] : null;
  const resolvedStandard = standard ? resolveStandard(standard, sex) : null;
  const standardProgress = resolvedStandard && rank
    ? Math.max(0, Math.min(1, (rank.ratio - resolvedStandard.floor) / (resolvedStandard.ceiling - resolvedStandard.floor)))
    : null;

  const noteText = noteDraft ?? exerciseNotes[exerciseName] ?? "";

  const handleSaveNote = () => {
    saveExerciseNote(exerciseName, noteText);
    setNoteSaved(true);
    window.setTimeout(() => setNoteSaved(false), 1600);
  };

  if (!exerciseName) {
    return (
      <Layout>
        <Spinner isDark={isDark} fullPage label={t("loading_routine")} />
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: isMobile ? "0" : "0 20px" }}>
        <button
          onClick={() => router.back()}
          className="feeg-surface feeg-press feeg-hover"
          style={{
            border: "none",
            fontSize: "1rem",
            cursor: "pointer",
            fontWeight: "600",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 0",
            "--feeg-fg": tk.accent,
            "--feeg-hover-fg": tk.accentHover,
            "--feeg-border-width": "0px",
            "--feeg-press-scale": 0.96,
          }}
        >
          <Icon name="chevronLeft" size={18} />
          Volver
        </button>

        {/* Cabecera: foto, nombre, grupo/equipo, favorito y rango — todo lo identificador del
            ejercicio en un único bloque, antes de las pestañas. */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: isMobile ? "14px" : "20px",
            backgroundColor: tk.surfaceAlt,
            border: `1px solid ${tk.border}`,
            borderRadius: tk.radius.lg,
            padding: isMobile ? "16px" : "22px",
            marginBottom: "20px",
          }}
        >
          <ExercisePhoto name={exerciseName} size={isMobile ? 64 : 88} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
              <h1 style={{ margin: 0, color: tk.text, fontSize: isMobile ? "1.25rem" : "1.6rem", fontWeight: 800, letterSpacing: "-0.02em", overflowWrap: "anywhere" }}>
                {translateExerciseName(exerciseName, language)}
              </h1>
              <button
                onClick={() => toggleFavoriteExercise(exerciseName)}
                aria-label={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                aria-pressed={isFavorite}
                className="feeg-press"
                style={{
                  flexShrink: 0,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: isFavorite ? tk.danger : tk.textFaint,
                  padding: "2px",
                  "--feeg-press-scale": 0.85,
                }}
              >
                <Icon name="heart" size={24} style={{ fill: isFavorite ? "currentColor" : "none" }} />
              </button>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
              {info?.group && <Badge isDark={isDark} variant="neutral">{t(info.group) || info.group}</Badge>}
              {info?.equipment && <Badge isDark={isDark} variant="outline">{info.equipment}</Badge>}
            </div>

            {rankPosition && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px" }}>
                <RankArt rank={rankPosition.rank} tier={rankPosition.tier} size={20} />
                <span style={{ fontSize: "0.9rem", fontWeight: 800, color: rankPosition.rank.color }}>{rankPosition.label}</span>
              </div>
            )}
          </div>
        </div>

        <ChipNav items={TABS} activeKey={activeTab} onChange={setActiveTab} isDark={isDark} ariaLabel="Secciones de la ficha del ejercicio" />

        <div style={{ marginTop: "20px", marginBottom: "40px" }}>
          {activeTab === "resumen" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {rankPosition && (
                <div style={{ backgroundColor: tk.surfaceAlt, border: `1px solid ${tk.border}`, borderRadius: tk.radius.lg, padding: isMobile ? "16px" : "20px" }}>
                  <p style={{ margin: "0 0 10px", color: tk.textFaint, fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Progreso hacia el siguiente rango
                  </p>
                  {!rankTarget?.isMaxed && rankTarget && (
                    <div
                      role="progressbar"
                      aria-valuenow={Math.round((rank.level % 1) * 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      style={{ height: "8px", backgroundColor: tk.surface, border: `1px solid ${tk.border}`, borderRadius: tk.radius.pill, overflow: "hidden", marginBottom: "10px" }}
                    >
                      <div style={{ width: `${Math.round((rank.level % 1) * 100)}%`, height: "100%", background: `linear-gradient(90deg, ${rankPosition.rank.accent}, ${rankPosition.rank.color})`, borderRadius: tk.radius.pill }} />
                    </div>
                  )}
                  <p style={{ margin: 0, color: tk.textMuted, fontSize: "0.88rem" }}>
                    {rankTarget?.isMaxed
                      ? "Nivel máximo en este ejercicio."
                      : rankTarget
                      ? <>Faltan <strong style={{ color: tk.text }}>{rankTarget.deltaKg < 1 ? rankTarget.deltaKg.toFixed(1) : Math.ceil(rankTarget.deltaKg)} {unit}</strong> para {getRankPosition(rankTarget.targetLevel).label}</>
                      : `${rank.ratio.toFixed(2)}× tu peso corporal`}
                  </p>

                  {resolvedStandard && standardProgress !== null && (
                    <div style={{ marginTop: "18px" }}>
                      <p style={{ margin: "0 0 8px", color: tk.textFaint, fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        Dónde caes en el baremo completo
                      </p>
                      <div style={{ position: "relative", height: "8px" }}>
                        <div style={{ position: "absolute", inset: 0, borderRadius: tk.radius.pill, background: RANK_SCALE, border: `1px solid ${tk.border}` }} />
                        <div
                          style={{
                            position: "absolute",
                            top: "-3px",
                            left: `${standardProgress * 100}%`,
                            transform: "translateX(-50%)",
                            width: "14px",
                            height: "14px",
                            borderRadius: "50%",
                            backgroundColor: tk.text,
                            border: `2px solid ${tk.surfaceAlt}`,
                            boxShadow: tk.shadow.float,
                          }}
                        />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
                        <span style={{ fontSize: "0.68rem", color: tk.textFaint, fontWeight: 700 }}>{RANKS[0].name}</span>
                        <span style={{ fontSize: "0.68rem", color: tk.textFaint, fontWeight: 700 }}>{RANKS[RANKS.length - 1].name}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ backgroundColor: tk.surfaceAlt, border: `1px solid ${tk.border}`, borderRadius: tk.radius.lg, padding: isMobile ? "16px" : "20px" }}>
                <p style={{ margin: "0 0 12px", color: tk.text, fontWeight: 800, fontSize: "1.02rem" }}>Progreso</p>
                <ExerciseProgressChart isDark={isDark} sessions={sessions} unit={unit} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: "12px" }}>
                {[
                  { label: "1RM estimado", value: record ? `${record.best1RM.toFixed(1)} ${unit}` : "-" },
                  { label: "Mayor volumen (serie)", value: record ? record.maxSingleSetVolume.toFixed(1) : "-" },
                  { label: "Sesiones totales", value: frequency.totalSessions || "-" },
                  { label: "Frecuencia reciente", value: frequency.perWeekRecent > 0 ? `${frequency.perWeekRecent}/sem` : "-" },
                ].map((stat) => (
                  <div key={stat.label} style={{ backgroundColor: tk.surfaceAlt, border: `1px solid ${tk.border}`, borderRadius: tk.radius.md, padding: "14px 10px", textAlign: "center" }}>
                    <div style={{ color: tk.accent, fontSize: isMobile ? "1.1rem" : "1.3rem", fontWeight: 800 }}>{stat.value}</div>
                    <div style={{ color: tk.textFaint, fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", marginTop: "4px" }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "records" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ backgroundColor: tk.surfaceAlt, border: `1px solid ${tk.border}`, borderRadius: tk.radius.lg, padding: isMobile ? "16px" : "20px" }}>
                <p style={{ margin: "0 0 16px", color: tk.text, fontWeight: 800, fontSize: "1.02rem" }}>Mejores marcas por repetición</p>
                {repRecords.length === 0 ? (
                  <EmptyState isDark={isDark} icon="award" title="Sin marcas todavía" description="Registra una serie de este ejercicio para empezar a ver tus récords." />
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "120px" : "150px"}, 1fr))`, gap: "12px" }}>
                    {repRecords.map((r) => (
                      <div key={r.reps} style={{ backgroundColor: tk.accentSoft, border: `1px solid ${tk.accent}55`, borderRadius: tk.radius.sm, padding: "14px", textAlign: "center" }}>
                        <p style={{ margin: "0 0 6px", color: tk.textMuted, fontSize: "0.78rem", fontWeight: 700 }}>{r.reps} rep{r.reps !== 1 ? "s" : ""}</p>
                        <p style={{ margin: 0, color: tk.accent, fontSize: "1.3rem", fontWeight: 800 }}>{r.weight.toFixed(1)} {unit}</p>
                        <p style={{ margin: "6px 0 0", color: tk.textFaint, fontSize: "0.68rem" }}>{formatDate(r.date)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ backgroundColor: tk.surfaceAlt, border: `1px solid ${tk.border}`, borderRadius: tk.radius.lg, padding: isMobile ? "16px" : "20px" }}>
                <p style={{ margin: "0 0 16px", color: tk.text, fontWeight: 800, fontSize: "1.02rem" }}>Línea de tiempo de récords</p>
                {prTimeline.length === 0 ? (
                  <EmptyState isDark={isDark} icon="trendUp" title="Sin récords registrados" description="Cuando superes tu mejor 1RM estimado en este ejercicio, aparecerá aquí." />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {prTimeline.map((m) => (
                      <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: `1px solid ${tk.border}` }}>
                        <Icon name="trendUp" size={16} color={tk.accent} style={{ flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: tk.text, fontSize: "0.9rem", fontWeight: 700 }}>
                            {m.weight}{unit} × {m.reps} <span style={{ color: tk.textMuted, fontWeight: 500 }}>· 1RM est. {m.oneRM.toFixed(1)}{unit}</span>
                          </div>
                          <div style={{ color: tk.textFaint, fontSize: "0.74rem", marginTop: "2px" }}>{formatDate(new Date(m.date))}</div>
                        </div>
                        {m.deltaOneRMPercent !== null && (
                          <Badge isDark={isDark} variant="accent">+{m.deltaOneRMPercent.toFixed(1)}%</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "historial" && (
            <div style={{ backgroundColor: tk.surfaceAlt, border: `1px solid ${tk.border}`, borderRadius: tk.radius.lg, padding: isMobile ? "16px" : "20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
                <p style={{ margin: 0, color: tk.text, fontWeight: 800, fontSize: "1.02rem" }}>Sesiones</p>
                <span style={{ color: tk.textMuted, fontSize: "0.82rem" }}>
                  {frequency.totalSessions} en total · {frequency.perWeekRecent}/semana (últimas 8 semanas)
                </span>
              </div>

              {sessions.length === 0 ? (
                <EmptyState isDark={isDark} icon="clock" title="Sin sesiones registradas" description="Este ejercicio no aparece todavía en ningún entreno terminado." />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {sessions.map((session, i) => (
                    <button
                      key={`${session.workoutId}-${i}`}
                      onClick={() => {
                        const workout = completedWorkouts.find((w) => w.id === session.workoutId);
                        if (workout) setViewingWorkout(workout);
                      }}
                      className="feeg-press feeg-hover"
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                        padding: "12px 14px",
                        borderRadius: tk.radius.md,
                        border: `1px solid ${tk.border}`,
                        backgroundColor: tk.surface,
                        color: tk.text,
                        cursor: "pointer",
                        textAlign: "left",
                        "--feeg-hover-bg": tk.surfaceHover,
                        "--feeg-hover-border": tk.accent,
                        "--feeg-press-scale": 0.98,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.workoutName}</div>
                        <div style={{ color: tk.textFaint, fontSize: "0.74rem", marginTop: "2px" }}>{formatDate(session.date)} · {session.series.length} series</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                        {session.bestSet && (
                          <span style={{ color: tk.accent, fontWeight: 700, fontSize: "0.88rem" }}>
                            {session.bestSet.weight}{unit} × {session.bestSet.reps}
                          </span>
                        )}
                        <Icon name="chevronRight" size={16} color={tk.textFaint} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "notas" && (
            <div style={{ backgroundColor: tk.surfaceAlt, border: `1px solid ${tk.border}`, borderRadius: tk.radius.lg, padding: isMobile ? "16px" : "20px" }}>
              <p style={{ margin: "0 0 6px", color: tk.text, fontWeight: 800, fontSize: "1.02rem" }}>Tus notas</p>
              <p style={{ margin: "0 0 14px", color: tk.textMuted, fontSize: "0.85rem" }}>
                Técnica, cues, lesiones a vigilar — lo que quieras recordar la próxima vez que hagas este ejercicio. Solo tú lo ves.
              </p>
              <textarea
                value={noteText}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="p. ej. codos pegados al cuerpo, bajar controlado…"
                rows={6}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "12px 14px",
                  borderRadius: tk.radius.md,
                  border: `1px solid ${tk.border}`,
                  backgroundColor: tk.surface,
                  color: tk.text,
                  fontSize: "0.92rem",
                  fontFamily: "inherit",
                  lineHeight: 1.5,
                  resize: "vertical",
                }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
                <button
                  onClick={handleSaveNote}
                  className="feeg-press"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 20px",
                    borderRadius: tk.radius.sm,
                    border: "none",
                    backgroundColor: tk.accent,
                    color: tk.onAccent,
                    fontWeight: 700,
                    cursor: "pointer",
                    "--feeg-press-scale": 0.96,
                  }}
                >
                  {noteSaved && <Icon name="check" size={15} />}
                  {noteSaved ? "Guardado" : "Guardar nota"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {viewingWorkout && (
        <ReadOnlyWorkoutModal
          workout={viewingWorkout}
          language={language}
          translate={t}
          onClose={() => setViewingWorkout(null)}
        />
      )}
    </Layout>
  );
}
