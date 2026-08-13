import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { getWorkoutTokens } from "../../lib/tokens";
import { pickPrimaryPRType } from "../../lib/exerciseStats";
import { Icon, RankArt, ExerciseRankList } from "../ui";
import { useRankUps } from "../../hooks/useRankUps";
import { useRanks } from "../../hooks/useRanks";
import { getRankPosition } from "../../data/ranks";

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}min`;
  return `${m}min`;
}

function formatDelta(n) {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(".", ",");
}

function formatValue(n) {
  return Number(n || 0).toLocaleString("es-ES", { maximumFractionDigits: 1 });
}

function buildRecordDetail(record, t) {
  if (record.tier === "historic") {
    const oneRMType = record.types.find((x) => x.type === "oneRM");
    if (oneRMType && oneRMType.deltaPercent != null) {
      return t("pr_summary_historic_detail").replace("{pct}", String(Math.round(oneRMType.deltaPercent)));
    }
  }

  const primary = pickPrimaryPRType(record.types);
  if (!primary) return null;

  switch (primary.type) {
    case "weight":
      return t("pr_summary_weight_detail")
        .replace("{delta}", formatDelta(primary.deltaAbsolute))
        .replace("{unit}", record.weightUnit)
        .replace("{prev}", formatDelta(primary.previousValue));
    case "reps":
      return t("pr_summary_reps_detail").replace("{delta}", String(Math.round(primary.deltaAbsolute)));
    case "oneRM":
      return t("pr_summary_percent_detail").replace("{pct}", String(Math.round(primary.deltaPercent ?? 0)));
    case "setVolume":
      return t("pr_summary_volume_detail").replace("{delta}", formatDelta(primary.deltaAbsolute)).replace("{unit}", record.weightUnit);
    default:
      return null;
  }
}

function buildRecordDeltaShort(record) {
  const primary = pickPrimaryPRType(record.types);
  if (!primary) return "";
  if (primary.type === "reps") return `+${Math.round(primary.deltaAbsolute)}`;
  if (primary.type === "oneRM") return `+${Math.round(primary.deltaPercent ?? 0)}%`;
  return `+${formatDelta(primary.deltaAbsolute)}${record.weightUnit}`;
}

/** Cuenta desde 0 hasta `target` con un ease-out, para que las cifras del cierre de sesión lleguen
 *  "en movimiento" en vez de aparecer ya resueltas — es el momento de más motivación de todo el
 *  entreno y merece algo más que texto estático. Se desactiva entera con reduced-motion. */
function useCountUp(target, { duration = 900, active = true } = {}) {
  const [value, setValue] = useState(active ? 0 : target);
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    if (!active) {
      setValue(target);
      return;
    }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const elapsed = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      setValue(targetRef.current * eased);
      if (elapsed < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);

  return value;
}

/** Confeti decorativo cuando la sesión trae algún logro (PR, récord de volumen, subida de rango).
 *  Puramente aria-hidden — no comunica nada que no esté ya en el texto, así que desactivarlo con
 *  reduced-motion no le quita información a nadie. */
function SummaryConfetti({ tk }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.35,
        duration: 1.5 + Math.random() * 1,
        width: 5 + Math.random() * 4,
        rotate: Math.random() * 360,
        drift: Math.round((Math.random() - 0.5) * 70),
        color: [tk.accent, "#ffd166", "#ff8fa3", "#8ecae6"][i % 4],
      })),
    [tk.accent]
  );

  return (
    <div className="summary-confetti" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            left: `${p.left}%`,
            width: `${p.width}px`,
            height: `${p.width * 0.4}px`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            "--feeg-confetti-drift": `${p.drift}px`,
            "--feeg-confetti-rotate": `${p.rotate}deg`,
          }}
        />
      ))}
    </div>
  );
}

function AchievementOrbit({ hasAchievement, reducedMotion, tk }) {
  return (
    <div className="summary-orbit" aria-hidden="true">
      <motion.div
        className="summary-orbit-ring"
        animate={reducedMotion ? undefined : { rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        style={{ borderColor: `${tk.accent}70` }}
      />
      <motion.div
        className="summary-orbit-ring summary-orbit-ring-inner"
        animate={reducedMotion ? undefined : { rotate: -360 }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        style={{ borderColor: `${tk.accent}35` }}
      />
      <motion.div
        className="summary-orbit-core"
        animate={reducedMotion ? undefined : { scale: [1, 1.045, 1] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        style={{ background: hasAchievement ? tk.accent : tk.surfaceAlt, color: hasAchievement ? tk.onAccent : tk.accent }}
      >
        <Icon name={hasAchievement ? "award" : "check"} size={38} strokeWidth={1.8} />
      </motion.div>
    </div>
  );
}

function Metric({ label, value, detail, tk, delay = 0 }) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
      transition={{ duration: tk.motion.duration.base, ease: tk.motion.ease.out, delay }}
      style={{ padding: "18px 4px 16px", minWidth: 0 }}
    >
      <div style={{ color: tk.text, fontSize: "clamp(1.35rem, 4vw, 1.9rem)", fontWeight: tk.weight.heavy, letterSpacing: "-0.05em", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ color: tk.accent, fontSize: "0.66rem", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: tk.weight.bold, marginTop: "10px" }}>
        {label}
      </div>
      {detail && <div style={{ color: tk.textFaint, fontSize: "0.72rem", marginTop: "5px" }}>{detail}</div>}
    </motion.div>
  );
}

/**
 * Resumen final del entrenamiento. La pantalla está pensada como un cierre de sesión, no como
 * otra tarjeta de estadísticas: primero reconoce el momento, después explica el rendimiento y
 * finalmente deja una acción clara para compartir o volver a entrenar.
 */
export default function WorkoutSummaryScreen({ workout, prRecords = [], workoutVolumeRecord = null, onDone, t }) {
  const tk = getWorkoutTokens();
  const translate = t || ((s) => s);
  const prefersReducedMotion = useReducedMotion();
  const [shared, setShared] = useState(false);
  const rankUps = useRankUps();
  const { available: ranksAvailable, exerciseRanks, bodyweightKg, sex } = useRanks();

  const sessionOrder = (workout?.exerciseDetails || workout?.details || [])
    .map((d) => d?.name || d?.exercise)
    .filter(Boolean);
  const sessionRanks = sessionOrder
    .map((name) => exerciseRanks.find((r) => r.exercise === name))
    .filter(Boolean);

  const realRecords = prRecords.filter((r) => r.tier);
  const firstEverOnly = prRecords.filter((r) => !r.tier && r.isFirstEver);
  const hasAchievement = realRecords.length > 0 || !!workoutVolumeRecord || rankUps.length > 0;

  const countActive = !prefersReducedMotion;
  const durationCount = useCountUp(workout.elapsedTime || 0, { active: countActive, duration: 900 });
  const volumeCount = useCountUp(workout.totalVolume || 0, { active: countActive, duration: 1100 });
  const seriesCount = useCountUp(workout.series || 0, { active: countActive, duration: 800 });
  const hero = realRecords.length === 1 ? realRecords[0] : null;
  const details = workout?.exerciseDetails || workout?.details || [];
  const completedExerciseCount = workout.exercises || details.length;
  const exerciseLabel = completedExerciseCount === 1 ? translate("exercise_singular") : translate("exercises_count").toLowerCase();

  const exerciseBreakdown = useMemo(() => details
    .map((detail) => {
      const series = Array.isArray(detail.series) ? detail.series : [];
      const volume = series.reduce((sum, serie) => sum + (Number(serie.weight) || 0) * (Number(serie.reps) || 0), 0);
      return { name: detail.name || detail.exercise, series: series.length, volume };
    })
    .filter((item) => item.name && item.series > 0), [details]);
  const maxExerciseVolume = Math.max(1, ...exerciseBreakdown.map((item) => item.volume));

  const headline = hero
    ? `${translate("summary_new_record_prefix")} ${hero.name}`
    : realRecords.length > 1
      ? translate("pr_summary_multi_title")
      : workoutVolumeRecord
        ? translate("pr_summary_workout_volume_title")
        : translate("workout_completed_title");
  const headlineDetail = hero
    ? buildRecordDetail(hero, translate)
    : workoutVolumeRecord
      ? translate("pr_summary_workout_volume_detail")
        .replace("{pct}", String(Math.round(workoutVolumeRecord.deltaPercent ?? 0)))
        .replace("{prev}", formatValue(workoutVolumeRecord.previousValue))
      : translate("summary_session_saved");

  const handleShare = async () => {
    const primaryDetail = hero ? buildRecordDetail(hero, translate) : headlineDetail;
    const shareText = `${workout.name} · ${formatValue(workout.totalVolume)} kg · ${workout.series} ${translate("series_label").toLowerCase()}${primaryDetail ? ` · ${primaryDetail}` : ""}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "FEEG", text: shareText });
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
      }
      setShared(true);
      window.setTimeout(() => setShared(false), 2200);
    } catch (_) {
      // Cancelar el diálogo nativo no debe convertir una acción opcional en un error visible.
    }
  };

  const pageVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: prefersReducedMotion ? 0 : 0.08 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 22 },
    show: { opacity: 1, y: 0, transition: { duration: tk.motion.duration.slow, ease: tk.motion.ease.out } },
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={pageVariants}
      style={{ minHeight: "100dvh", background: `radial-gradient(circle at 50% -10%, ${tk.accent}18 0%, transparent 34%), ${tk.bg}`, color: tk.text, overflow: "hidden" }}
    >
      <style>{`
        .summary-page { width: min(100%, 1060px); margin: 0 auto; padding: clamp(28px, 6vw, 70px) clamp(18px, 5vw, 54px) 44px; box-sizing: border-box; }
        .summary-hero { position: relative; display: grid; grid-template-columns: 180px minmax(0, 1fr); align-items: center; gap: clamp(24px, 5vw, 70px); padding: clamp(26px, 5vw, 52px); border: 1px solid rgba(46,230,197,0.22); border-radius: 28px; background: linear-gradient(135deg, rgba(46,230,197,0.11), rgba(17,17,17,0.9) 42%, rgba(17,17,17,0.72)); box-shadow: 0 24px 80px rgba(0, 18, 15, 0.36), inset 0 1px rgba(255,255,255,0.07); overflow: hidden; }
        .summary-hero::after { content: ""; position: absolute; width: 360px; height: 360px; right: -160px; top: -210px; border-radius: 50%; border: 1px solid rgba(46,230,197,0.13); box-shadow: 0 0 0 32px rgba(46,230,197,0.035), 0 0 0 64px rgba(46,230,197,0.02); pointer-events: none; }
        .summary-confetti { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 2; }
        .summary-confetti span { position: absolute; top: -12px; border-radius: 2px; opacity: 0; animation-name: feeg-confetti-fall; animation-timing-function: cubic-bezier(0.25,0.46,0.45,0.94); animation-fill-mode: forwards; }
        @keyframes feeg-confetti-fall { 0% { opacity: 0; transform: translate(0, 0) rotate(0deg); } 12% { opacity: 1; } 100% { opacity: 0; transform: translate(var(--feeg-confetti-drift), 260px) rotate(var(--feeg-confetti-rotate)); } }
        .summary-hero-copy { position: relative; z-index: 1; min-width: 0; text-align: left; }
        .summary-eyebrow { color: ${tk.accent}; font-size: 0.68rem; letter-spacing: 0.16em; text-transform: uppercase; font-weight: 800; }
        .summary-orbit { position: relative; width: 156px; height: 156px; display: grid; place-items: center; margin: auto; }
        .summary-orbit-ring { position: absolute; inset: 0; border: 1px dashed; border-radius: 50%; }
        .summary-orbit-ring::after { content: ""; position: absolute; width: 8px; height: 8px; top: 14px; left: 22px; background: ${tk.accent}; border-radius: 50%; box-shadow: 0 0 18px ${tk.accent}; }
        .summary-orbit-ring-inner { inset: 14px; border-style: solid; border-width: 1px; opacity: 0.65; }
        .summary-orbit-ring-inner::after { top: auto; left: auto; right: 8px; bottom: 12px; width: 5px; height: 5px; opacity: 0.7; }
        .summary-orbit-core { width: 88px; height: 88px; border-radius: 32px; display: grid; place-items: center; box-shadow: 0 12px 38px rgba(46,230,197,0.25), inset 0 1px rgba(255,255,255,0.34); }
        .summary-content-grid { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(280px, 0.95fr); gap: 16px; margin-top: 16px; }
        .summary-panel { border: 1px solid rgba(255,255,255,0.08); background: rgba(17,17,17,0.78); border-radius: 22px; padding: clamp(20px, 3vw, 30px); box-shadow: inset 0 1px rgba(255,255,255,0.035); }
        .summary-panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 20px; }
        .summary-panel-label { color: ${tk.textMuted}; font-size: 0.68rem; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; }
        .summary-metrics { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid rgba(255,255,255,0.08); border-bottom: 1px solid rgba(255,255,255,0.08); margin-top: 20px; }
        .summary-metrics > div + div { border-left: 1px solid rgba(255,255,255,0.08); }
        .summary-breakdown-row { display: grid; grid-template-columns: minmax(0, 1fr) 42px; gap: 12px; align-items: center; padding: 11px 0; }
        .summary-breakdown-track { height: 5px; margin-top: 8px; border-radius: 10px; background: rgba(255,255,255,0.08); overflow: hidden; }
        .summary-breakdown-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, ${tk.accent}55, ${tk.accent}); transform-origin: left center; }
        .summary-actions { display: flex; gap: 10px; justify-content: center; margin-top: 24px; }
        .summary-action { min-height: 48px; border-radius: 14px; padding: 0 20px; border: 1px solid rgba(255,255,255,0.12); background: ${tk.surfaceAlt}; color: ${tk.text}; font: inherit; font-weight: 700; cursor: pointer; transition: transform 180ms ease, border-color 180ms ease, background 180ms ease; }
        .summary-action:hover { transform: translateY(-2px); border-color: ${tk.accent}90; background: ${tk.surfaceHover}; }
        .summary-action:active { transform: scale(0.98); }
        .summary-action-primary { background: ${tk.accent}; color: ${tk.onAccent}; border-color: ${tk.accent}; box-shadow: 0 10px 24px rgba(46,230,197,0.22); }
        .summary-action-primary:hover { background: ${tk.accentHover}; }
        @media (max-width: 720px) { .summary-page { padding-top: 22px; } .summary-hero { grid-template-columns: 1fr; text-align: center; padding: 28px 20px 32px; gap: 22px; } .summary-hero-copy { text-align: center; } .summary-content-grid { grid-template-columns: 1fr; } .summary-actions { flex-direction: column-reverse; } .summary-action { width: 100%; } }
        @media (prefers-reduced-motion: reduce) { .summary-action { transition: none; } }
      `}</style>

      <div className="summary-page">
        <motion.div variants={itemVariants} className="summary-hero">
          {hasAchievement && !prefersReducedMotion && <SummaryConfetti tk={tk} />}
          <AchievementOrbit hasAchievement={hasAchievement} reducedMotion={prefersReducedMotion} tk={tk} />
          <div className="summary-hero-copy">
            <div className="summary-eyebrow">FEEG · {translate("summary_session_complete_label")}</div>
            <h1 style={{ margin: "12px 0 10px", fontSize: "clamp(2rem, 6vw, 4.4rem)", lineHeight: 0.98, letterSpacing: "-0.065em", fontWeight: tk.weight.heavy, textWrap: "balance" }}>
              {headline}
            </h1>
            <p style={{ maxWidth: "560px", margin: 0, color: tk.textMuted, fontSize: "clamp(0.95rem, 2vw, 1.1rem)", lineHeight: 1.55 }}>
              {headlineDetail}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "9px", marginTop: "22px", color: tk.textFaint, fontSize: "0.82rem" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: tk.accent, boxShadow: `0 0 12px ${tk.accent}` }} />
              <span>{workout.name}</span>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="summary-metrics">
          <Metric label={translate("duration_label")} value={formatDuration(durationCount)} tk={tk} delay={0.08} />
          <Metric label={translate("volume")} value={`${formatValue(volumeCount)} kg`} detail={translate("summary_total_load_detail")} tk={tk} delay={0.14} />
          <Metric label={translate("series_label")} value={Math.round(seriesCount)} detail={`${completedExerciseCount} ${exerciseLabel}`} tk={tk} delay={0.2} />
        </motion.div>

        <div className="summary-content-grid">
          {(realRecords.length > 0 || workoutVolumeRecord || firstEverOnly.length > 0) && (
            <motion.section variants={itemVariants} className="summary-panel">
              <div className="summary-panel-heading">
                <div>
                  <div className="summary-panel-label">{translate("summary_achievements_label")}</div>
                  <div style={{ color: tk.text, fontSize: "1.2rem", fontWeight: tk.weight.bold, marginTop: "6px" }}>{translate("summary_progress_title")}</div>
                </div>
                <Icon name="trendUp" size={22} color={tk.accent} />
              </div>

              {hero ? (
                <div style={{ display: "flex", gap: "14px", alignItems: "flex-start", padding: "17px", borderRadius: 16, background: tk.accentSoft, border: `1px solid ${tk.accent}55` }}>
                  <div style={{ minWidth: 38, height: 38, display: "grid", placeItems: "center", borderRadius: 12, background: tk.accent, color: tk.onAccent }}><Icon name="award" size={21} /></div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: tk.accent, fontSize: "0.68rem", fontWeight: tk.weight.bold, letterSpacing: "0.1em", textTransform: "uppercase" }}>{translate("pr_summary_eyebrow")}</div>
                    <div style={{ color: tk.text, fontSize: "1rem", fontWeight: tk.weight.bold, marginTop: "5px" }}>{hero.name}</div>
                    <div style={{ color: tk.textMuted, fontSize: "0.84rem", marginTop: "5px", lineHeight: 1.45 }}>{buildRecordDetail(hero, translate)}</div>
                  </div>
                  <div style={{ marginLeft: "auto", color: tk.accent, fontSize: "1.25rem", fontWeight: tk.weight.heavy, whiteSpace: "nowrap" }}>{buildRecordDeltaShort(hero)}</div>
                </div>
              ) : null}

              {workoutVolumeRecord && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0", borderTop: hero ? `1px solid ${tk.border}` : "none" }}>
                  <Icon name="barChart" size={20} color={tk.accent} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: tk.text, fontWeight: tk.weight.bold, fontSize: "0.9rem" }}>{translate("pr_summary_workout_volume_title")}</div>
                    <div style={{ color: tk.textMuted, fontSize: "0.8rem", marginTop: 4 }}>{translate("pr_summary_workout_volume_detail").replace("{pct}", String(Math.round(workoutVolumeRecord.deltaPercent ?? 0))).replace("{prev}", formatValue(workoutVolumeRecord.previousValue))}</div>
                  </div>
                </div>
              )}

              {realRecords.length > 1 && (
                <div style={{ borderTop: `1px solid ${tk.border}`, marginTop: 4 }}>
                  {realRecords.map((record, index) => (
                    <div key={record.name} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 0", borderBottom: index === realRecords.length - 1 ? "none" : `1px solid ${tk.border}` }}>
                      <span style={{ color: tk.text, fontSize: "0.86rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{record.name}</span>
                      <span style={{ color: tk.accent, fontSize: "0.82rem", fontWeight: tk.weight.bold, flexShrink: 0 }}>{buildRecordDeltaShort(record)}</span>
                    </div>
                  ))}
                </div>
              )}

              {firstEverOnly.length > 0 && <div style={{ color: tk.textFaint, fontSize: "0.76rem", lineHeight: 1.5, marginTop: 16 }}>{translate("pr_summary_first_ever_prefix")} {firstEverOnly.map((r) => r.name).join(", ")}</div>}
            </motion.section>
          )}

          <motion.section variants={itemVariants} className="summary-panel">
            <div className="summary-panel-heading">
              <div>
                <div className="summary-panel-label">{translate("summary_breakdown_label")}</div>
                <div style={{ color: tk.text, fontSize: "1.2rem", fontWeight: tk.weight.bold, marginTop: "6px" }}>{translate("summary_workload_title")}</div>
              </div>
              <span style={{ color: tk.textFaint, fontSize: "0.76rem" }}>{exerciseBreakdown.length} {exerciseBreakdown.length === 1 ? translate("exercise_singular") : translate("exercises_count").toLowerCase()}</span>
            </div>
            {exerciseBreakdown.length > 0 ? exerciseBreakdown.slice(0, 6).map((item, index) => (
              <motion.div key={item.name} className="summary-breakdown-row" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: tk.motion.duration.base, delay: prefersReducedMotion ? 0 : 0.2 + index * 0.06, ease: tk.motion.ease.out }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, color: tk.text, fontSize: "0.84rem", fontWeight: tk.weight.medium }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
                    <span style={{ color: tk.textFaint, flexShrink: 0 }}>{item.series}×</span>
                  </div>
                  <div className="summary-breakdown-track"><motion.div className="summary-breakdown-fill" initial={{ scaleX: 0 }} animate={{ scaleX: Math.max(0.06, item.volume / maxExerciseVolume) }} transition={{ duration: 0.8, delay: prefersReducedMotion ? 0 : 0.26 + index * 0.06, ease: tk.motion.ease.out }} /></div>
                </div>
                <div style={{ color: tk.accent, fontSize: "0.76rem", textAlign: "right", whiteSpace: "nowrap" }}>{item.volume > 0 ? `${formatValue(item.volume)} kg` : "—"}</div>
              </motion.div>
            )) : <div style={{ color: tk.textMuted, fontSize: "0.86rem" }}>{translate("summary_no_breakdown")}</div>}
          </motion.section>
        </div>

        {ranksAvailable && sessionRanks.length > 0 && (
          <motion.section variants={itemVariants} style={{ marginTop: 16, padding: "22px", border: `1px solid ${tk.border}`, borderRadius: 22, background: tk.surface }}>
            <div className="summary-panel-label" style={{ marginBottom: 14 }}>{translate("summary_ranks_label")}</div>
            <ExerciseRankList ranks={sessionRanks} bodyweightKg={bodyweightKg} sex={sex} isDark tokens={tk} />
          </motion.section>
        )}

        {rankUps.slice(0, 3).map((up, index) => {
          const position = getRankPosition(up.currentLevel);
          return (
            <motion.div key={up.group ?? "__overall__"} variants={itemVariants} style={{ display: "flex", alignItems: "center", gap: 13, marginTop: 12, padding: "14px 18px", borderRadius: 16, background: `${position.rank.color}12`, border: `1px solid ${position.rank.color}45` }}>
              <div style={{ width: 38, height: 38, display: "grid", placeItems: "center", flexShrink: 0, borderRadius: 12, background: `${position.rank.color}22` }}><RankArt rank={position.rank} tier={position.tier} size={23} /></div>
              <div style={{ minWidth: 0 }}><div style={{ color: tk.text, fontSize: "0.88rem", fontWeight: tk.weight.bold }}>{up.isNewRank ? translate("summary_new_rank") : translate("summary_rank_up")}</div><div style={{ color: tk.textMuted, fontSize: "0.78rem", marginTop: 3 }}>{up.group ? `${up.group} · ` : "Nivel global · "}<span style={{ color: position.rank.color, fontWeight: tk.weight.bold }}>{position.label}</span></div></div>
              <Icon name="arrowRight" size={17} color={position.rank.color} style={{ marginLeft: "auto" }} />
            </motion.div>
          );
        })}

        <motion.div variants={itemVariants} className="summary-actions">
          <button type="button" className="summary-action" onClick={handleShare} aria-label={translate("summary_share_label")}><Icon name={shared ? "check" : "share"} size={17} style={{ display: "inline-block", verticalAlign: "-3px", marginRight: 8 }} />{shared ? translate("summary_shared_label") : translate("summary_share_label")}</button>
          <button type="button" className="summary-action summary-action-primary" onClick={onDone}>{translate("done_label")} <Icon name="arrowRight" size={17} style={{ display: "inline-block", verticalAlign: "-3px", marginLeft: 8 }} /></button>
        </motion.div>
      </div>
    </motion.div>
  );
}
