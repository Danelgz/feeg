import { getTokens } from '../../lib/tokens';
import { getRankPosition } from '../../data/ranks';
import { nextLevelTarget, type ExerciseRank, type Sex } from '../../lib/rankEngine';
import RankIcon from './RankIcon';

interface ExerciseRankListProps {
  ranks: ExerciseRank[];
  bodyweightKg: number;
  sex: Sex;
  isDark: boolean;
  /** Traduce el nombre del ejercicio al idioma activo. */
  translateExercise?: (name: string) => string;
  /** Tokens de la pantalla de entrenamiento, que ignora el tema del usuario. */
  tokens?: ReturnType<typeof getTokens>;
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
}: ExerciseRankListProps) {
  const tk = tokens ?? getTokens(isDark);

  if (ranks.length === 0) return null;

  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: tk.space.sm }}>
      {ranks.map((rank) => {
        const position = getRankPosition(rank.level);
        const target = nextLevelTarget(rank.exercise, rank.level, rank.best1RM, bodyweightKg, sex);
        const name = translateExercise ? translateExercise(rank.exercise) : rank.exercise;

        return (
          <li
            key={rank.exercise}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: tk.space.md,
              padding: tk.space.md,
              borderRadius: tk.radius.md,
              backgroundColor: tk.surfaceAlt,
              border: `1px solid ${tk.border}`,
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
              <RankIcon icon={position.rank.icon} color={position.rank.color} accent={position.rank.accent} size={19} />
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
