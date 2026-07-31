import { useReducedMotion } from 'motion/react';
import { getTokens } from '../../lib/tokens';
import { getRankPosition } from '../../data/ranks';
import RankArt from './RankArt';

type BadgeSize = 'sm' | 'md' | 'lg';

interface RankBadgeProps {
  /** Nivel absoluto 1-30. Admite decimales: la parte fraccionaria alimenta la barra de progreso. */
  level: number;
  prestigeLevels?: number;
  isDark: boolean;
  size?: BadgeSize;
  /** Texto secundario bajo el nombre del rango ("Pecho", "3 ejercicios puntuables"). */
  caption?: string;
  /** Barra fina de progreso hacia el siguiente nivel. */
  showProgress?: boolean;
}

const SIZES: Record<BadgeSize, { icon: number; disc: number; name: string; caption: string }> = {
  sm: { icon: 18, disc: 32, name: '0.85rem', caption: '0.75rem' },
  md: { icon: 26, disc: 46, name: '1.1rem', caption: '0.85rem' },
  lg: { icon: 38, disc: 68, name: '1.4rem', caption: '0.95rem' },
};

/**
 * Insignia de rango: marca, nombre y progreso.
 *
 * El disco toma el color del rango a baja opacidad en vez de a saturación plena. Con diez rangos y
 * colores tan dispares como el gris de Principiante y el dorado de Élite, rellenar el disco a tope
 * convierte cualquier pantalla con varias insignias —el mapa por grupo muscular son doce— en un
 * mosaico de colores peleándose. Así el color identifica sin dominar, y la marca sigue siendo lo
 * que se lee primero.
 */
export default function RankBadge({
  level,
  prestigeLevels = 0,
  isDark,
  size = 'md',
  caption,
  showProgress = false,
}: RankBadgeProps) {
  const tk = getTokens(isDark);
  const prefersReducedMotion = useReducedMotion();
  const dims = SIZES[size];
  const position = getRankPosition(level, prestigeLevels);
  const { rank, label, progressToNext, prestige } = position;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: tk.space.md, minWidth: 0 }}>
      <div
        style={{
          width: dims.disc,
          height: dims.disc,
          borderRadius: tk.radius.full,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          backgroundColor: `${rank.color}1f`,
          border: `1px solid ${rank.color}59`,
        }}
      >
        <RankArt rank={rank} tier={position.tier} size={dims.icon} animated={!prefersReducedMotion} />
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: dims.name,
            fontWeight: tk.weight.bold,
            color: tk.text,
            letterSpacing: '-0.01em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </div>

        {caption && (
          <div style={{ fontSize: dims.caption, color: tk.textMuted, marginTop: '1px' }}>{caption}</div>
        )}

        {showProgress && !prestige && (
          <div
            style={{
              height: '4px',
              backgroundColor: tk.surfaceAlt,
              border: `1px solid ${tk.border}`,
              borderRadius: tk.radius.pill,
              overflow: 'hidden',
              marginTop: tk.space.sm,
            }}
          >
            <div
              style={{
                width: `${Math.round(progressToNext * 100)}%`,
                height: '100%',
                backgroundColor: rank.color,
                borderRadius: tk.radius.pill,
                transition: `width ${tk.motion.css.slow}`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
