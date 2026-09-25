import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { getTokens } from '../../lib/tokens';
import { RANKS, formatRarity, type RankDefinition } from '../../data/ranks';
import { tapFeedback } from '../../lib/haptics';
import { RankArt } from '../ui';
import StatSection from './StatSection';

interface RankLadderSectionProps {
  /** Rango en el que está el usuario ahora mismo. */
  currentRank: RankDefinition;
  /** Escalón actual dentro del rango, para pintar la insignia del usuario tal cual la lleva. */
  currentTier?: number;
  isDark: boolean;
  isMobile?: boolean;
}

/**
 * La escalera completa como una pista horizontal: las diez insignias en una fila, las alcanzadas a
 * color y las que faltan apagadas, unidas por una línea que se llena hasta tu rango.
 *
 * Antes era una lista vertical de diez tarjetas con borde (~700px de alto) para contar diez nombres
 * y diez porcentajes. En una fila se ve de un vistazo dónde estás y cuánto queda, y el detalle de
 * cada peldaño (niveles y rareza) aparece al tocarlo, debajo, en una sola línea.
 *
 * El % es una curva diseñada a mano, no un dato en vivo de usuarios de FEEG — ver data/ranks.ts.
 */
export default function RankLadderSection({ currentRank, currentTier = 1, isDark, isMobile = false }: RankLadderSectionProps) {
  const tk = getTokens(isDark);
  const reduceMotion = useReducedMotion();
  const [picked, setPicked] = useState(currentRank.index);
  const sel = RANKS[picked];
  const reached = sel.index <= currentRank.index;
  // Centro de cada insignia en % del ancho: la línea de progreso va del primero al rango actual.
  const center = (i: number) => ((i + 0.5) / RANKS.length) * 100;

  return (
    <StatSection title="Escalera de rangos" meta={`${currentRank.index + 1} de ${RANKS.length}`} isDark={isDark} isMobile={isMobile}>
      <div style={{ position: 'relative' }}>
        <div aria-hidden style={{ position: 'absolute', top: '50%', left: `${center(0)}%`, right: `${100 - center(RANKS.length - 1)}%`, height: 2, background: tk.hairline, transform: 'translateY(-50%)' }} />
        <motion.div
          aria-hidden
          initial={reduceMotion ? false : { width: 0 }}
          animate={{ width: `${center(currentRank.index) - center(0)}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{ position: 'absolute', top: '50%', left: `${center(0)}%`, height: 2, background: `linear-gradient(90deg, ${RANKS[0].color}, ${currentRank.color})`, transform: 'translateY(-50%)' }}
        />
        <div role="radiogroup" aria-label="Rangos" style={{ position: 'relative', display: 'grid', gridTemplateColumns: `repeat(${RANKS.length}, minmax(0, 1fr))` }}>
          {RANKS.map((rank) => {
            const isCurrent = rank.index === currentRank.index;
            const isPicked = rank.index === picked;
            const locked = rank.index > currentRank.index;
            return (
              <button
                key={rank.slug}
                type="button"
                role="radio"
                aria-checked={isPicked}
                aria-label={`${rank.name}${isCurrent ? ' (tu rango)' : ''}`}
                onClick={() => {
                  tapFeedback();
                  setPicked(rank.index);
                }}
                className="feeg-press"
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  padding: '6px 0',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  // Suben un poco la seleccionada para que se lea sin depender del color.
                  transform: isPicked ? 'translateY(-3px)' : 'none',
                  transition: 'transform .2s ease',
                }}
              >
                <span
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: 999,
                    padding: 2,
                    background: tk.bg,
                    boxShadow: isCurrent ? `0 0 0 2px ${rank.color}` : isPicked ? `0 0 0 1.5px ${tk.textFaint}` : 'none',
                  }}
                >
                  <RankArt rank={rank} tier={isCurrent ? currentTier : locked ? 1 : 3} size={isMobile ? 28 : 40} locked={locked} />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={sel.slug}
          initial={reduceMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
          transition={{ duration: 0.16 }}
          style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginTop: 10, padding: '10px 0 0', borderTop: `1px solid ${tk.hairline}` }}
        >
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: sel.color }}>{sel.name}</span>
            <span style={{ fontSize: '0.76rem', color: tk.textMuted, fontWeight: 600 }}>
              {' '}· niveles {sel.minLevel}–{sel.minLevel + 2}
              {sel.index === currentRank.index ? ' · estás aquí' : reached ? ' · superado' : ''}
            </span>
          </div>
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: tk.text, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{formatRarity(sel)}</span>
        </motion.div>
      </AnimatePresence>
      <p style={{ margin: '6px 0 0', fontSize: '0.7rem', color: tk.textFaint, lineHeight: 1.5 }}>
        Rareza orientativa según lo exigente que es cada tramo del baremo, no un recuento de usuarios.
      </p>
    </StatSection>
  );
}
