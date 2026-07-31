import { useState, type CSSProperties } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { getTokens } from '../../lib/tokens';
import { MAX_LEVEL, getRankPosition } from '../../data/ranks';
import type { RankMilestone } from '../../lib/rankEngine';
import { Icon, RankArt } from '../ui';

interface RankHeroCardProps {
  /** Nivel global 1-30, con decimales: la parte fraccionaria es la barra de progreso. */
  level: number;
  prestigeLevels?: number;
  milestone: RankMilestone | null;
  rankedGroups: number;
  rankedExerciseCount: number;
  isDark: boolean;
  isMobile?: boolean;
  /** Traduce el nombre de un grupo muscular al idioma activo. */
  translateGroup?: (group: string) => string;
  /** Traduce el nombre de un ejercicio al idioma activo. */
  translateExercise?: (name: string) => string;
}

/**
 * El rango global, como titular de la pantalla.
 *
 * Antes esto era una `RankBadge` de tamaño `lg`: el mismo componente que dibuja cada fila de una
 * lista, sólo que un poco más grande. Para la única pantalla de la app cuyo trabajo es hacerte
 * sentir algo, anunciar el logro con la tipografía de una fila era desperdiciarlo.
 *
 * Sobre la línea de "lo que falta": dice el siguiente peldaño CONCRETO (qué ejercicio, cuántos kilos,
 * qué grupo sube) y no el siguiente rango global, porque el global es la media de los grupos y
 * subir uno solo lo mueve una fracción — prometer "te faltan 3 kg para Atleta I" sería mentir. Ver
 * `nextRankMilestone` en lib/rankEngine.ts.
 */
export default function RankHeroCard({
  level,
  prestigeLevels = 0,
  milestone,
  rankedGroups,
  rankedExerciseCount,
  isDark,
  isMobile = false,
  translateGroup,
  translateExercise,
}: RankHeroCardProps) {
  const tk = getTokens(isDark);
  const prefersReducedMotion = useReducedMotion();
  const [showHelp, setShowHelp] = useState(false);

  const position = getRankPosition(level, prestigeLevels);
  const { rank, label, progressToNext, prestige } = position;

  const artSize = isMobile ? 84 : 104;
  const groupName = (group: string) => translateGroup?.(group) || group;
  const milestoneTarget = milestone ? getRankPosition(milestone.groupTargetLevel) : null;

  return (
    <section
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: tk.radius.lg,
        padding: isMobile ? tk.space.xl : tk.space.xxl,
        marginBottom: tk.space.lg,
        // El color del rango entra como luz, no como relleno: un halo detrás de la insignia sobre la
        // superficie normal de la app. Teñir la tarjeta entera funcionaría con un rango, pero el
        // gris de Principiante y el crema de Leyenda darían dos tarjetas irreconocibles entre sí.
        background: `radial-gradient(120% 130% at 88% 0%, ${rank.color}24 0%, ${rank.color}0a 42%, transparent 72%), ${tk.surface}`,
        border: `1px solid ${rank.color}3d`,
        boxShadow: tk.shadow.card,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: tk.space.lg }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: tk.space.sm, marginBottom: tk.space.xs }}>
            <span
              style={{
                fontSize: tk.fontSize.xs,
                color: tk.textMuted,
                fontWeight: tk.weight.medium,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
              }}
            >
              Rango global
            </span>
            <button
              type="button"
              onClick={() => setShowHelp((v) => !v)}
              aria-expanded={showHelp}
              aria-label="Cómo se calcula tu rango"
              className="feeg-press"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '18px',
                height: '18px',
                padding: 0,
                border: 'none',
                background: 'none',
                color: showHelp ? tk.accent : tk.textFaint,
                cursor: 'pointer',
                '--feeg-press-scale': 0.88,
              } as CSSProperties}
            >
              <Icon name="alertCircle" size={14} />
            </button>
          </div>

          <h3
            style={{
              margin: 0,
              // Se aprieta el interletrado en vez de dejarlo suelto: a este tamaño el tracking por
              // defecto separa las letras lo justo para que el nombre parezca estirado.
              letterSpacing: '-0.03em',
              lineHeight: 1.02,
              fontSize: isMobile ? tk.fontSize.display : tk.fontSize.hero,
              fontWeight: tk.weight.heavy,
              color: rank.color,
              textTransform: 'uppercase',
              // Titán es casi negro sobre fondo casi negro: sin este halo su nombre desaparece de la
              // pantalla mientras todos los demás rangos se leen.
              textShadow: `0 0 28px ${rank.color}59`,
              overflowWrap: 'anywhere',
            }}
          >
            {label}
          </h3>

          <p style={{ margin: `${tk.space.xs} 0 0`, fontSize: tk.fontSize.sm, color: tk.textMuted }}>
            {prestige
              ? `Nivel ${MAX_LEVEL} · el tope de la escalera`
              : `Nivel ${position.level} de ${MAX_LEVEL}`}
            {' · '}
            {rankedGroups} {rankedGroups === 1 ? 'grupo' : 'grupos'}
            {' · '}
            {rankedExerciseCount} {rankedExerciseCount === 1 ? 'ejercicio' : 'ejercicios'}
          </p>
        </div>

        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.86 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: tk.motion.duration.slow, ease: tk.motion.ease.out }}
          style={{ flexShrink: 0, filter: `drop-shadow(0 6px 22px ${rank.color}4d)` }}
        >
          <RankArt rank={rank} tier={position.tier} size={artSize} animated={!prefersReducedMotion} />
        </motion.div>
      </div>

      {/* En prestigio no hay "siguiente": la barra llena todo el rato sería una promesa vacía. */}
      {!prestige && (
        <div
          role="progressbar"
          aria-valuenow={Math.round(progressToNext * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progreso hacia el nivel ${Math.min(MAX_LEVEL, position.level + 1)}`}
          style={{
            height: '6px',
            backgroundColor: tk.surfaceAlt,
            border: `1px solid ${tk.border}`,
            borderRadius: tk.radius.pill,
            overflow: 'hidden',
            marginTop: tk.space.lg,
          }}
        >
          <motion.div
            initial={prefersReducedMotion ? false : { width: 0 }}
            animate={{ width: `${Math.round(progressToNext * 100)}%` }}
            transition={{ duration: tk.motion.duration.slow, ease: tk.motion.ease.out, delay: 0.1 }}
            style={{
              height: '100%',
              borderRadius: tk.radius.pill,
              background: `linear-gradient(90deg, ${rank.accent}, ${rank.color})`,
            }}
          />
        </div>
      )}

      {milestone && milestoneTarget && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: tk.space.md,
            marginTop: tk.space.lg,
            padding: tk.space.md,
            borderRadius: tk.radius.md,
            backgroundColor: `${tk.accent}14`,
            border: `1px solid ${tk.accent}33`,
          }}
        >
          <span style={{ color: tk.accent, display: 'flex', flexShrink: 0 }}>
            <Icon name="zap" size={16} />
          </span>
          <p style={{ margin: 0, fontSize: tk.fontSize.sm, color: tk.textMuted, lineHeight: 1.45 }}>
            <strong style={{ color: tk.text, fontWeight: tk.weight.bold }}>
              +{milestone.deltaKg < 1 ? milestone.deltaKg.toFixed(1) : Math.ceil(milestone.deltaKg)} kg
            </strong>{' '}
            en {translateExercise?.(milestone.exercise) || milestone.exercise} y{' '}
            {groupName(milestone.group)} sube a{' '}
            <strong style={{ color: milestoneTarget.rank.color, fontWeight: tk.weight.bold }}>
              {milestoneTarget.label}
            </strong>
          </p>
        </div>
      )}

      {showHelp && (
        <p
          style={{
            margin: `${tk.space.lg} 0 0`,
            paddingTop: tk.space.lg,
            borderTop: `1px solid ${tk.border}`,
            fontSize: tk.fontSize.xs,
            color: tk.textFaint,
            lineHeight: 1.6,
          }}
        >
          Cada ejercicio con baremo se puntúa comparando tu mejor marca estimada con lo que se
          considera nivel 1 y nivel {MAX_LEVEL} <strong style={{ color: tk.textMuted }}>en múltiplos de tu
          peso corporal</strong>. El rango de un grupo es el de su mejor ejercicio, y el global es la
          media de tus grupos — así entrenar más cosas nunca te baja de rango, pero descuidar un
          grupo entero sí se nota.
        </p>
      )}
    </section>
  );
}
