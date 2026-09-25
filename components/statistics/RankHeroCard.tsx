import { useState, type CSSProperties } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { getTokens } from '../../lib/tokens';
import { MAX_LEVEL, RANKS, formatRarity, getRankPosition } from '../../data/ranks';
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

const ROMAN = ['I', 'II', 'III'];

/**
 * El rango global, como titular de la pantalla.
 *
 * Sin tarjeta: la insignia grande sobre un halo del color del rango, el nombre y una barra de nivel
 * con sus dos extremos rotulados ("Disciplinado II → III"), que es lo que convierte un porcentaje en
 * una meta. Debajo, en una fila de tres cifras, lo que sostiene ese rango.
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
  const next = position.level < MAX_LEVEL ? getRankPosition(position.level + 1) : null;
  const nextRank = RANKS[rank.index + 1] ?? null;

  const artSize = isMobile ? 128 : 148;
  const groupName = (group: string) => translateGroup?.(group) || group;
  const milestoneTarget = milestone ? getRankPosition(milestone.groupTargetLevel) : null;
  const pct = Math.round(progressToNext * 100);

  return (
    <section style={{ position: 'relative', marginBottom: 6 }}>
      {/* Halo del color del rango detrás de la insignia: la luz, no un relleno de tarjeta. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: '50%',
          top: -40,
          width: 360,
          height: 300,
          transform: 'translateX(-50%)',
          background: `radial-gradient(closest-side, ${rank.color}${isDark ? '33' : '2b'}, transparent)`,
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 6 }}>
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.8, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          style={{ filter: `drop-shadow(0 10px 28px ${rank.color}55)` }}
        >
          <RankArt rank={rank} tier={position.tier} size={artSize} animated={!prefersReducedMotion} />
        </motion.div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
          <span style={{ fontSize: '0.7rem', color: tk.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
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
            margin: '4px 0 0',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
            fontSize: isMobile ? '2rem' : '2.4rem',
            fontWeight: 900,
            color: tk.text,
          }}
        >
          {prestige ?? (
            <>
              {rank.name} <span style={{ color: rank.color }}>{ROMAN[position.tier - 1]}</span>
            </>
          )}
        </h3>
        <div style={{ marginTop: 4, fontSize: '0.82rem', color: tk.textMuted, fontWeight: 600 }}>
          Nivel {position.level} de {MAX_LEVEL} · <span style={{ color: rank.color }}>{formatRarity(rank)}</span>
        </div>
        {/* Texto completo para lectores de pantalla y tests: el título visual parte el número romano. */}
        <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{label}</span>
      </div>

      {/* En prestigio no hay "siguiente": la barra llena todo el rato sería una promesa vacía. */}
      {!prestige && next && (
        <div style={{ position: 'relative', marginTop: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, marginBottom: 6 }}>
            <span style={{ color: tk.textMuted }}>Nivel {position.level}</span>
            <span style={{ color: tk.text }}>
              {pct}% <span style={{ color: tk.textMuted, fontWeight: 600 }}>hacia</span>{' '}
              <span style={{ color: next.rank.color }}>{next.label}</span>
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progreso hacia el nivel ${position.level + 1}`}
            style={{ height: 8, borderRadius: 99, background: tk.hairline, overflow: 'hidden' }}
          >
            <motion.div
              initial={prefersReducedMotion ? false : { width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
              style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${rank.accent}, ${rank.color})` }}
            />
          </div>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          marginTop: 16,
          borderTop: `1px solid ${tk.hairline}`,
          borderBottom: `1px solid ${tk.hairline}`,
        }}
      >
        {[
          { label: 'Grupos', value: rankedGroups },
          { label: 'Ejercicios', value: rankedExerciseCount },
          { label: 'Siguiente rango', value: nextRank ? nextRank.name : '—', color: nextRank?.color },
        ].map((cell, i) => (
          <div key={cell.label} style={{ padding: '11px 0 11px', paddingLeft: i ? 14 : 0, borderLeft: i ? `1px solid ${tk.hairline}` : 'none', minWidth: 0 }}>
            <div style={{ fontSize: '0.7rem', color: tk.textMuted, fontWeight: 600 }}>{cell.label}</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: cell.color ?? tk.text, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {cell.value}
            </div>
          </div>
        ))}
      </div>

      {milestone && milestoneTarget && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              display: 'grid',
              placeItems: 'center',
              background: tk.accentSoft,
              color: tk.accent,
              flexShrink: 0,
            }}
          >
            <Icon name="target" size={17} />
          </span>
          <p style={{ margin: 0, fontSize: '0.82rem', color: tk.textMuted, lineHeight: 1.45, flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: tk.textFaint }}>
              Tu próxima subida
            </span>
            <strong style={{ color: tk.text, fontWeight: 800 }}>
              +{milestone.deltaKg < 1 ? milestone.deltaKg.toFixed(1) : Math.ceil(milestone.deltaKg)} kg
            </strong>{' '}
            en {translateExercise?.(milestone.exercise) || milestone.exercise} y {groupName(milestone.group)} sube a{' '}
            <strong style={{ color: milestoneTarget.rank.color, fontWeight: 800 }}>{milestoneTarget.label}</strong>
          </p>
          <RankArt rank={milestoneTarget.rank} tier={milestoneTarget.tier} size={34} />
        </div>
      )}

      {showHelp && (
        <p style={{ margin: 0, padding: '4px 0 12px', fontSize: '0.76rem', color: tk.textMuted, lineHeight: 1.6 }}>
          Cada ejercicio con baremo se puntúa comparando tu mejor marca estimada con lo que se considera nivel 1 y nivel {MAX_LEVEL}{' '}
          <strong style={{ color: tk.text }}>en múltiplos de tu peso corporal</strong>. El rango de un grupo es la media de sus mejores
          ejercicios, y el global es la media de tus grupos — así entrenar más cosas nunca te baja de rango, pero descuidar un grupo
          entero sí se nota.
        </p>
      )}
    </section>
  );
}
