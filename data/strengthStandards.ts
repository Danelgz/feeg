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

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // MÁQUINAS Y POLEAS
  //
  // Advertencia que conviene tener presente al leer estos números: la carga de una máquina NO es
  // comparable entre gimnasios. Una prensa de piernas de una marca mueve una resistencia distinta
  // que otra con el mismo disco por la geometría de las palancas, y un "50" de una polea depende de
  // la relación de poleas del aparato. Estos baremos son necesariamente más aproximados que los de
  // barra, donde 100 kg son 100 kg en cualquier sitio.
  //
  // Se incluyen igualmente porque mucha gente entrena casi exclusivamente en máquinas, y dejarles el
  // sistema de rangos vacío es peor que dárselo con un margen de error. Los ejercicios donde la
  // dispersión entre fabricantes es más salvaje (sentadilla péndulo, iso-laterales exóticos) se han
  // dejado fuera a propósito.
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  // ── Pecho ────────────────────────────────────────────────────────────────────────────────────
  'Press de Banca (Máquina Smith)': { floor: 0.45, ceiling: 2.10, femaleFactor: 0.62 },
  'Press de Banca Inclinado (Máquina Smith)': { floor: 0.35, ceiling: 1.75, femaleFactor: 0.62 },
  'Press de Pecho (Máquina)': { floor: 0.35, ceiling: 1.80, femaleFactor: 0.62 },
  'Press de Pecho Inclinado (Máquina)': { floor: 0.30, ceiling: 1.55, femaleFactor: 0.62 },
  'Mariposa (Pec Deck)': { floor: 0.20, ceiling: 1.00, femaleFactor: 0.65 },
  'Aperturas (Máquina)': { floor: 0.20, ceiling: 1.00, femaleFactor: 0.65 },
  'Fondos en Máquina para Pecho': { floor: 0.30, ceiling: 1.60, femaleFactor: 0.65 },
  'Cruce de Poleas (Cables Cruzados)': { floor: 0.10, ceiling: 0.50, femaleFactor: 0.65 },

  // ── Espalda ──────────────────────────────────────────────────────────────────────────────────
  'Jalón al Pecho (Cable)': { floor: 0.35, ceiling: 1.50, femaleFactor: 0.68 },
  'Jalón al Pecho (Máquina)': { floor: 0.35, ceiling: 1.50, femaleFactor: 0.68 },
  'Jalón al Pecho Agarre Cerrado (Cable)': { floor: 0.32, ceiling: 1.45, femaleFactor: 0.68 },
  'Remo Sentado con Cable': { floor: 0.35, ceiling: 1.60, femaleFactor: 0.68 },
  'Remo Sentado con Agarre en V (Cable)': { floor: 0.35, ceiling: 1.60, femaleFactor: 0.68 },
  'Remo Sentado (Máquina)': { floor: 0.35, ceiling: 1.60, femaleFactor: 0.68 },
  'Pullover (Máquina)': { floor: 0.20, ceiling: 0.90, femaleFactor: 0.65 },
  'Encogimientos (Máquina)': { floor: 0.50, ceiling: 2.40, femaleFactor: 0.70 },
  'Encogimiento de Hombros (Máquina Smith)': { floor: 0.50, ceiling: 2.50, femaleFactor: 0.70 },
  'Encogimiento de Hombros (Cable)': { floor: 0.35, ceiling: 1.70, femaleFactor: 0.70 },

  // ── Hombros ──────────────────────────────────────────────────────────────────────────────────
  'Press de Hombros (Máquina Smith)': { floor: 0.25, ceiling: 1.15, femaleFactor: 0.60 },
  'Press de Hombros Sentado (Máquina)': { floor: 0.25, ceiling: 1.10, femaleFactor: 0.60 },
  'Press de Hombros (Máquina de Placas)': { floor: 0.20, ceiling: 1.00, femaleFactor: 0.60 },
  'Elevación Lateral (Máquina)': { floor: 0.08, ceiling: 0.40, femaleFactor: 0.62 },
  'Elevación Lateral (Cable)': { floor: 0.04, ceiling: 0.22, femaleFactor: 0.62 },
  'Tirón a la Cara (Face Pull)': { floor: 0.10, ceiling: 0.50, femaleFactor: 0.68 },
  'Vuelos Posteriores (Máquina)': { floor: 0.10, ceiling: 0.50, femaleFactor: 0.68 },
  'Vuelos Posteriores (Cable)': { floor: 0.06, ceiling: 0.30, femaleFactor: 0.68 },

  // ── Bíceps ───────────────────────────────────────────────────────────────────────────────────
  'Curl de Bíceps (Cable)': { floor: 0.12, ceiling: 0.60, femaleFactor: 0.60 },
  'Curl de Bíceps (Máquina)': { floor: 0.12, ceiling: 0.60, femaleFactor: 0.60 },
  'Curl Predicador (Máquina)': { floor: 0.12, ceiling: 0.55, femaleFactor: 0.60 },
  'Curl Martillo (Cable)': { floor: 0.10, ceiling: 0.50, femaleFactor: 0.62 },

  // ── Tríceps ──────────────────────────────────────────────────────────────────────────────────
  'Extensión de Tríceps (Cable)': { floor: 0.15, ceiling: 0.75, femaleFactor: 0.62 },
  'Tríceps con Polea': { floor: 0.15, ceiling: 0.75, femaleFactor: 0.62 },
  'Extensión de Tríceps en Polea con Cuerda': { floor: 0.12, ceiling: 0.60, femaleFactor: 0.62 },
  'Extensión de Tríceps en Polea Alta (Barra)': { floor: 0.15, ceiling: 0.75, femaleFactor: 0.62 },
  'Extensión de Tríceps Sobre la Cabeza (Cable)': { floor: 0.10, ceiling: 0.55, femaleFactor: 0.62 },
  'Extensión de Tríceps (Máquina)': { floor: 0.15, ceiling: 0.80, femaleFactor: 0.62 },
  'Tríceps Sentado (Máquina)': { floor: 0.15, ceiling: 0.80, femaleFactor: 0.62 },

  // ── Cuádriceps ───────────────────────────────────────────────────────────────────────────────
  // La prensa admite mucho más peso que una sentadilla: el asiento sostiene el tronco y el recorrido
  // es más corto, así que su techo está muy por encima. Un techo de 2.5× la haría trivial de maxear.
  'Prensa de Piernas': { floor: 1.00, ceiling: 4.50, femaleFactor: 0.78 },
  'Prensa de Piernas Sentado': { floor: 0.90, ceiling: 4.00, femaleFactor: 0.78 },
  'Sentadilla Hack (Máquina)': { floor: 0.60, ceiling: 2.80, femaleFactor: 0.75 },
  // Antes su techo (2.40) quedaba POR DEBAJO del de la sentadilla libre (2.50), al revés de lo que
  // tiene sentido: el recorrido guiado del Smith y el asiento/respaldo de la máquina quitan trabajo
  // de estabilización, así que a igualdad de fuerza de piernas se mueve más peso, no menos.
  'Sentadilla (Máquina Smith)': { floor: 0.50, ceiling: 2.60, femaleFactor: 0.72 },
  'Sentadilla (Máquina)': { floor: 0.50, ceiling: 2.60, femaleFactor: 0.72 },
  'Extensión de Pierna (Máquina)': { floor: 0.30, ceiling: 1.50, femaleFactor: 0.75 },
  // Mismo caso: sin la barra cargando la columna, el cinturón deja mover más peso que una sentadilla
  // libre a igualdad de piernas, no menos — su techo (2.20) también estaba por debajo del de barra.
  'Sentadilla con Cinturón (Belt Squat)': { floor: 0.45, ceiling: 2.50, femaleFactor: 0.75 },

  // ── Femoral ──────────────────────────────────────────────────────────────────────────────────
  'Curl de Piernas Acostado (Máquina)': { floor: 0.25, ceiling: 1.20, femaleFactor: 0.75 },
  'Curl de Pierna Sentado (Máquina)': { floor: 0.30, ceiling: 1.40, femaleFactor: 0.75 },
  'Curl de Piernas de Pie (Máquina)': { floor: 0.15, ceiling: 0.70, femaleFactor: 0.75 },

  // ── Glúteos ──────────────────────────────────────────────────────────────────────────────────
  'Impulso de Cadera (Máquina)': { floor: 0.60, ceiling: 3.00, femaleFactor: 0.85 },
  'Hip Thrust (Máquina Smith)': { floor: 0.60, ceiling: 3.00, femaleFactor: 0.85 },
  'Peso Muerto (Máquina Smith)': { floor: 0.60, ceiling: 2.90, femaleFactor: 0.72 },
  'Tirón con Polea Entre las Piernas (Cable Pull-Through)': { floor: 0.25, ceiling: 1.20, femaleFactor: 0.80 },
  'Patada de Glúteo con Cable': { floor: 0.10, ceiling: 0.55, femaleFactor: 0.85 },

  // ── Gemelos ──────────────────────────────────────────────────────────────────────────────────
  'Elevación de Gemelos de Pie (Máquina)': { floor: 0.60, ceiling: 2.60, femaleFactor: 0.80 },
  'Elevación de Gemelos de Pie (Máquina Smith)': { floor: 0.55, ceiling: 2.50, femaleFactor: 0.80 },
  'Elevación de Gemelos Sentado': { floor: 0.30, ceiling: 1.50, femaleFactor: 0.80 },
  'Press de Pantorrilla (Máquina)': { floor: 0.80, ceiling: 3.50, femaleFactor: 0.80 },
  'Extensión de Pantorrilla (Máquina)': { floor: 0.50, ceiling: 2.30, femaleFactor: 0.80 },

  // ── Abdomen ──────────────────────────────────────────────────────────────────────────────────
  // Los primeros abdominales puntuables: hasta ahora el grupo se quedaba siempre sin rango porque
  // todo lo demás es peso corporal o tiempo.
  'Crunch Corto con Cable': { floor: 0.15, ceiling: 0.80, femaleFactor: 0.70 },
  'Crunch Corto (Máquina)': { floor: 0.20, ceiling: 1.00, femaleFactor: 0.70 },
  'Press Pallof en Polea': { floor: 0.08, ceiling: 0.40, femaleFactor: 0.70 },

  // ── Aductor / Abductor ───────────────────────────────────────────────────────────────────────
  'Aducción de Caderas (Máquina)': { floor: 0.25, ceiling: 1.20, femaleFactor: 0.90 },
  'Abducción de Caderas (Máquina)': { floor: 0.25, ceiling: 1.20, femaleFactor: 0.90 },
};

/** Cuántos ejercicios del catálogo tienen baremo. Útil en tests para detectar borrados accidentales. */
export const RANKABLE_EXERCISE_COUNT = Object.keys(STRENGTH_STANDARDS).length;
