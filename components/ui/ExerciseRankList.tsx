import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { getTokens } from '../../lib/tokens';
import { getRankPosition } from '../../data/ranks';
import { nextLevelTarget, type ExerciseRank, type Sex } from '../../lib/rankEngine';
import RankArt from './RankArt';

interface ExerciseRankListProps {
  ranks: ExerciseRank[];
  bodyweightKg: number;
  sex: Sex;
  isDark: boolean;
  /** Traduce el nombre del ejercicio al idioma activo. */
  translateExercise?: (name: string) => string;
  /** Tokens de la pantalla de entrenamiento, que ignora el tema del usuario. */
  tokens?: ReturnType<typeof getTokens>;
  /**
   * Si se pasa, cada fila se vuelve pulsable y lleva al detalle de ese ejercicio (nombre interno
   * del catálogo, no el traducido). Sin ella la lista es de solo lectura — el resumen de fin de
   * entreno la usa así a propósito: no tiene sentido salir de la pantalla de celebración hacia
   * Estadísticas en mitad del resumen.
   */
  onExerciseClick?: (exercise: string) => void;
  /**
   * 'list' (por defecto): una columna, cada fila ocupa todo el ancho — el patrón de siempre,
   * usado en el detalle de un grupo muscular donde cada fila ya lleva su propia barra de
   * progreso y conviene leerla de un tirón.
   * 'grid': se reparte en columnas (`repeat(auto-fill, minmax(...))`) en vez de apilarse en una
   * sola tira — para el resumen de fin de entreno, donde una lista de una sola columna en una
   * pantalla ancha deja casi todo el ancho vacío entre el nombre y la barra de progreso de cada
   * fila. Con varias columnas la sección se aprovecha de verdad y dos o tres ejercicios sueltos
   * no arrastran una única línea flotando en medio de la tarjeta.
   */
  layout?: 'list' | 'grid';
}

/**
 * Lista de ejercicios con su rango y lo que falta para el siguiente.
 *
 * La misma pieza sirve al resumen de fin de entreno (los ejercicios de esa sesión) y al detalle de
 * un grupo muscular (los ejercicios de ese grupo). Son la misma pregunta con distinto filtro, así
 * que comparten componente en vez de duplicarse con dos maquetaciones que acabarían divergiendo.
 *
 * Lo que hace que esto valga la pena es la última línea de cada fila: "te faltan 4 kg". Un rango es
 * una etiqueta; los kilos que faltan son algo que se puede intentar el jueves.
 */
export default function ExerciseRankList({
  ranks,
  bodyweightKg,
  sex,
  isDark,
  translateExercise,
  tokens,
  onExerciseClick,
  layout = 'list',
}: ExerciseRankListProps) {
  const tk = tokens ?? getTokens(isDark);

  if (ranks.length === 0) return null;

  const isFlat = layout === 'grid';

  return (
    <ul style={{ listStyle: 'none', width: '100%', minWidth: 0, margin: 0, padding: 0, display: 'grid', gap: isFlat ? 0 : tk.space.sm }}>
      {ranks.map((rank, index) => {
        const position = getRankPosition(rank.level);
        const target = nextLevelTarget(rank.exercise, rank.level, rank.best1RM, bodyweightKg, sex);
        const name = translateExercise ? translateExercise(rank.exercise) : rank.exercise;
        const isLast = index === ranks.length - 1;

        const rowProps = {
          key: rank.exercise,
          className: onExerciseClick ? 'feeg-press feeg-hover' : undefined,
          onClick: onExerciseClick ? () => onExerciseClick(rank.exercise) : undefined,
          role: onExerciseClick ? 'button' : undefined,
          tabIndex: onExerciseClick ? 0 : undefined,
          onKeyDown: onExerciseClick
            ? (e: ReactKeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onExerciseClick(rank.exercise);
                }
              }
            : undefined,
        };

        // 'grid' (mejor nombre sería "flat"): fila a todo el ancho sin caja propia — solo una
        // línea divisoria fina entre ejercicios, como el resto de listas de la app — con una
        // barra de progreso horizontal que sí usa el ancho disponible, en vez de la cajita con
        // borde y la barra vertical de 3px pensadas para una columna estrecha (ver 'list' abajo).
        if (isFlat) {
          return (
            <li
              {...rowProps}
              style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                minWidth: 0,
                boxSizing: 'border-box',
                gap: tk.space.md,
                padding: `${tk.space.sm} 2px`,
                borderBottom: isLast ? 'none' : `1px solid ${tk.border}`,
                cursor: onExerciseClick ? 'pointer' : undefined,
                ...(onExerciseClick
                  ? ({ '--feeg-bg': 'transparent', '--feeg-hover-bg': tk.surfaceAlt, '--feeg-press-scale': 0.99 } as CSSProperties)
                  : null),
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: tk.radius.full,
                  backgroundColor: `${position.rank.color}1f`,
                  border: `1px solid ${position.rank.color}59`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <RankArt rank={position.rank} tier={position.tier} size={18} />
              </div>

              <div style={{ minWidth: 0, flex: '1 1 auto', maxWidth: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: tk.space.sm, minWidth: 0, maxWidth: '100%' }}>
                  <span
                    style={{
                      color: tk.text,
                      fontSize: tk.fontSize.sm,
                      fontWeight: tk.weight.medium,
                      minWidth: 0,
                      flex: '1 1 auto',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {name}
                  </span>
                  <span style={{ flexShrink: 1, maxWidth: '42%', color: position.rank.color, fontWeight: tk.weight.bold, fontSize: tk.fontSize.xs, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>
                    {position.label}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: tk.space.sm, marginTop: '6px', minWidth: 0, maxWidth: '100%' }}>
                  <div
                    aria-hidden="true"
                    style={{ flex: 1, height: '4px', borderRadius: tk.radius.pill, backgroundColor: tk.border, overflow: 'hidden' }}
                  >
                    <div
                      style={{
                        width: `${Math.round(position.progressToNext * 100)}%`,
                        height: '100%',
                        backgroundColor: position.rank.color,
                        borderRadius: 'inherit',
                      }}
                    />
                  </div>
                  <span style={{ flexShrink: 1, maxWidth: '42%', fontSize: tk.fontSize.xs, color: tk.textFaint, fontVariantNumeric: 'tabular-nums', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>
                    {target?.isMaxed
                      ? 'al máximo'
                      : target && target.deltaKg > 0
                        ? `-${target.deltaKg < 1 ? target.deltaKg.toFixed(1) : Math.ceil(target.deltaKg)}kg`
                        : ''}
                  </span>
                </div>
              </div>
            </li>
          );
        }

        return (
          <li
            {...rowProps}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: tk.space.md,
              padding: tk.space.md,
              borderRadius: tk.radius.md,
              backgroundColor: tk.surfaceAlt,
              border: `1px solid ${tk.border}`,
              cursor: onExerciseClick ? 'pointer' : undefined,
              ...(onExerciseClick
                ? ({ '--feeg-bg': tk.surfaceAlt, '--feeg-hover-bg': tk.surfaceHover, '--feeg-press-scale': 0.985 } as CSSProperties)
                : null),
            }}
          >
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: tk.radius.full,
                backgroundColor: `${position.rank.color}1f`,
                border: `1px solid ${position.rank.color}59`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <RankArt rank={position.rank} tier={position.tier} size={19} />
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  color: tk.text,
                  fontSize: tk.fontSize.sm,
                  fontWeight: tk.weight.medium,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {name}
              </div>
              <div style={{ fontSize: tk.fontSize.xs, marginTop: '2px' }}>
                <span style={{ color: position.rank.color, fontWeight: tk.weight.bold }}>{position.label}</span>
                {target && !target.isMaxed && target.deltaKg > 0 && (
                  <span style={{ color: tk.textFaint }}>
                    {' '}· faltan{' '}
                    <span style={{ color: tk.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                      {target.deltaKg < 1 ? target.deltaKg.toFixed(1) : Math.ceil(target.deltaKg)} kg
                    </span>
                  </span>
                )}
                {target?.isMaxed && <span style={{ color: tk.textFaint }}> · al máximo</span>}
              </div>
            </div>

            {/* Barra de avance dentro del escalón actual. Vertical y estrecha para que la fila siga
                leyéndose como una línea de texto y no como una tarjeta. */}
            <div
              aria-hidden="true"
              style={{
                width: '3px',
                height: '30px',
                borderRadius: tk.radius.pill,
                backgroundColor: tk.border,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'flex-end',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: `${Math.round(position.progressToNext * 100)}%`,
                  backgroundColor: position.rank.color,
                  borderRadius: tk.radius.pill,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
