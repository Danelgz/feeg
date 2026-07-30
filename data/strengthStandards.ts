// Baremos de fuerza: qué hay que levantar, en múltiplos del peso corporal, para estar en el nivel 1
// y en el nivel 30 de cada ejercicio.
//
// ── Por qué sólo ~45 ejercicios de los 429 del catálogo ────────────────────────────────────────
// No existen estándares de fuerza para un cruce de poleas ni para "Alrededor del Mundo", y la
// pregunta "¿cuánto es un cruce de poleas de nivel Élite?" no tiene respuesta: los aislamientos se
// hacen con carga ligera A PROPÓSITO. Sólo se puntúan los compuestos con barra, mancuerna o lastre,
// donde la carga sí mide fuerza. El resto de ejercicios siguen contando para volumen, series y PRs
// — simplemente no generan rango.
//
// ── La convención que evita el problema de las mancuernas ──────────────────────────────────────
// `floor` y `ceiling` son múltiplos del peso corporal DEL NÚMERO QUE EL USUARIO ESCRIBE EN FEEG, no
// de la carga real. Para un press de banca con mancuernas eso es el peso de UNA mancuerna, no la
// suma de las dos. Así el baremo no depende de si la app registra por mancuerna o total, que es una
// ambigüedad que habría contaminado cada entrada de esta tabla.
//
// ── Ejercicios con lastre ──────────────────────────────────────────────────────────────────────
// En dominadas y fondos con peso añadido la carga real es el cuerpo más el lastre, así que se marcan
// con `bodyweightLoaded` y el motor calcula (peso corporal + lastre) / peso corporal. Por eso su
// `floor` es 1.0: mover el propio cuerpo una vez ya es el suelo de la escala.
//
// ── femaleFactor ───────────────────────────────────────────────────────────────────────────────
// Multiplica floor y ceiling. Ronda 0.6 en tren superior y 0.72 en tren inferior, donde la
// diferencia es bastante menor. El empuje de caderas va a 0.85 porque es el patrón donde la brecha
// casi desaparece. Sin este factor una mujer con un press de banca a 0.9× su peso —que es fuerte—
// saldría rankeada como principiante.

export interface StrengthStandard {
  /** Múltiplo del peso corporal correspondiente al nivel 1 (hombre). */
  floor: number;
  /** Múltiplo correspondiente al nivel 30 (hombre). */
  ceiling: number;
  /** Factor aplicado a floor y ceiling para mujer. */
  femaleFactor: number;
  /** La carga real es peso corporal + lo registrado (dominadas/fondos lastrados). */
  bodyweightLoaded?: boolean;
}

export const STRENGTH_STANDARDS: Record<string, StrengthStandard> = {
  // ── Pecho ────────────────────────────────────────────────────────────────────────────────────
  'Press de Banca (Barra)': { floor: 0.40, ceiling: 2.00, femaleFactor: 0.62 },
  'Press de Banca Inclinado (Barra)': { floor: 0.30, ceiling: 1.65, femaleFactor: 0.62 },
  'Press de Banca en Declive (Barra)': { floor: 0.40, ceiling: 2.00, femaleFactor: 0.62 },
  'Press de Banca con Pies Elevados (Barra)': { floor: 0.35, ceiling: 1.80, femaleFactor: 0.62 },
  'Press de Suelo (Barra)': { floor: 0.35, ceiling: 1.75, femaleFactor: 0.62 },
  'Press de Banca (Mancuerna)': { floor: 0.15, ceiling: 0.85, femaleFactor: 0.62 },
  'Press de Banca Inclinado (Mancuerna)': { floor: 0.12, ceiling: 0.72, femaleFactor: 0.62 },
  'Fondos (Con Peso Añadido)': { floor: 1.00, ceiling: 1.90, femaleFactor: 0.70, bodyweightLoaded: true },

  // ── Espalda ──────────────────────────────────────────────────────────────────────────────────
  'Peso Muerto (Barra)': { floor: 0.60, ceiling: 3.00, femaleFactor: 0.72 },
  'Peso Muerto Sumo (Barra)': { floor: 0.60, ceiling: 3.00, femaleFactor: 0.72 },
  'Peso Muerto (Barra Trap)': { floor: 0.70, ceiling: 3.20, femaleFactor: 0.72 },
  'Rack Pull (Barra)': { floor: 0.80, ceiling: 3.50, femaleFactor: 0.72 },
  'Remo Inclinado (Barra)': { floor: 0.30, ceiling: 1.60, femaleFactor: 0.65 },
  'Remo Pendlay (Barra)': { floor: 0.30, ceiling: 1.50, femaleFactor: 0.65 },
  'Remo en Punta (Barra)': { floor: 0.30, ceiling: 1.55, femaleFactor: 0.65 },
  'Remo con Mancuerna': { floor: 0.15, ceiling: 0.75, femaleFactor: 0.65 },
  'Encogimiento de Hombros (Barra)': { floor: 0.50, ceiling: 2.50, femaleFactor: 0.70 },
  'Dominada (Con Peso Añadido)': { floor: 1.00, ceiling: 1.90, femaleFactor: 0.70, bodyweightLoaded: true },
  'Dominadas Supinas con Peso (Chin Up)': { floor: 1.00, ceiling: 2.00, femaleFactor: 0.70, bodyweightLoaded: true },

  // ── Hombros ──────────────────────────────────────────────────────────────────────────────────
  'Press Militar de Pie (Barra)': { floor: 0.25, ceiling: 1.20, femaleFactor: 0.60 },
  'Press de Hombros (Barra)': { floor: 0.25, ceiling: 1.20, femaleFactor: 0.60 },
  'Press de Hombros Sentado (Barra)': { floor: 0.28, ceiling: 1.30, femaleFactor: 0.60 },
  'Empuje de Fuerza (Push Press)': { floor: 0.35, ceiling: 1.50, femaleFactor: 0.62 },
  'Press de Hombros (Mancuerna)': { floor: 0.10, ceiling: 0.50, femaleFactor: 0.60 },
  'Press Arnold (Mancuerna)': { floor: 0.08, ceiling: 0.45, femaleFactor: 0.60 },
  'Elevación Lateral (Mancuerna)': { floor: 0.04, ceiling: 0.25, femaleFactor: 0.62 },

  // ── Bíceps ───────────────────────────────────────────────────────────────────────────────────
  'Curl de Bíceps (Barra)': { floor: 0.15, ceiling: 0.80, femaleFactor: 0.60 },
  'Curl con Barra EZ': { floor: 0.15, ceiling: 0.80, femaleFactor: 0.60 },
  'Curl Predicador (Barra)': { floor: 0.12, ceiling: 0.60, femaleFactor: 0.60 },
  'Curl de Bíceps (Mancuerna)': { floor: 0.07, ceiling: 0.35, femaleFactor: 0.60 },
  'Curl Martillo (Mancuerna)': { floor: 0.08, ceiling: 0.38, femaleFactor: 0.62 },

  // ── Tríceps ──────────────────────────────────────────────────────────────────────────────────
  'Press de Banca Agarre Cerrado (Barra)': { floor: 0.30, ceiling: 1.50, femaleFactor: 0.62 },
  'Press Francés (Barra)': { floor: 0.12, ceiling: 0.65, femaleFactor: 0.60 },
  'Press JM (Barra)': { floor: 0.20, ceiling: 0.90, femaleFactor: 0.60 },
  'Extensión de Tríceps (Barra)': { floor: 0.12, ceiling: 0.60, femaleFactor: 0.60 },
  'Fondo de Tríceps (Con Peso Añadido)': { floor: 1.00, ceiling: 1.80, femaleFactor: 0.70, bodyweightLoaded: true },

  // ── Cuádriceps ───────────────────────────────────────────────────────────────────────────────
  'Sentadilla (Barra)': { floor: 0.50, ceiling: 2.50, femaleFactor: 0.72 },
  'Sentadilla Delantera (Barra)': { floor: 0.40, ceiling: 2.00, femaleFactor: 0.72 },
  'Sentadilla al Cajón (Barra)': { floor: 0.45, ceiling: 2.30, femaleFactor: 0.72 },
  'Sentadilla con Pausa (Barra)': { floor: 0.40, ceiling: 2.10, femaleFactor: 0.72 },
  'Sentadilla Sumo (Barra)': { floor: 0.50, ceiling: 2.40, femaleFactor: 0.72 },
  'Sentadilla Zercher (Barra)': { floor: 0.35, ceiling: 1.70, femaleFactor: 0.72 },
  'Sentadilla Goblet (Mancuerna)': { floor: 0.15, ceiling: 0.70, femaleFactor: 0.72 },
  'Zancada (Barra)': { floor: 0.25, ceiling: 1.20, femaleFactor: 0.72 },

  // ── Femoral ──────────────────────────────────────────────────────────────────────────────────
  'Peso Muerto Rumano (Barra)': { floor: 0.45, ceiling: 2.30, femaleFactor: 0.72 },
  'Peso Muerto Piernas Estiradas': { floor: 0.40, ceiling: 2.10, femaleFactor: 0.72 },
  'Buen Día (Barra)': { floor: 0.25, ceiling: 1.20, femaleFactor: 0.70 },
  'Peso Muerto Rumano (Mancuerna)': { floor: 0.15, ceiling: 0.80, femaleFactor: 0.72 },

  // ── Glúteos ──────────────────────────────────────────────────────────────────────────────────
  'Empuje de Caderas (Barra)': { floor: 0.60, ceiling: 3.00, femaleFactor: 0.85 },
  'Puente de Glúteos Parcial (Barra)': { floor: 0.50, ceiling: 2.50, femaleFactor: 0.85 },

  // ── Gemelos ──────────────────────────────────────────────────────────────────────────────────
  'Elevación de Gemelos de Pie (Barra)': { floor: 0.50, ceiling: 2.20, femaleFactor: 0.80 },
  'Elevación de Gemelos de Pie (Mancuerna)': { floor: 0.15, ceiling: 0.75, femaleFactor: 0.80 },

  // ── Antebrazo ────────────────────────────────────────────────────────────────────────────────
  'Curl de Muñeca Palmas Arriba (Barra)': { floor: 0.10, ceiling: 0.50, femaleFactor: 0.60 },
};

/** Cuántos ejercicios del catálogo tienen baremo. Útil en tests para detectar borrados accidentales. */
export const RANKABLE_EXERCISE_COUNT = Object.keys(STRENGTH_STANDARDS).length;
