// lib/exerciseMatcher.js
//
// Conecta el nombre de ejercicio "en bruto" que trae un CSV importado (Hevy, u otra app en el
// futuro) con el nombre canónico del catálogo de FEEG (data/exercises.js). Sin esto, un ejercicio
// importado se guarda con el nombre literal de la app de origen y nunca coincide con el mismo
// ejercicio registrado nativamente en FEEG — historial y PRs quedan partidos en dos identidades
// distintas para el mismo movimiento (ver nota de arquitectura sobre `name` como identidad estable
// en data/exercises.js).
//
// Tres niveles de confianza, de mayor a menor:
//   1. Alias exacto conocido (tabla de nombres habituales de Hevy en inglés) → conexión automática.
//   2. Alias que el propio usuario confirmó en una importación anterior (localStorage) → automática.
//   3. Coincidencia difusa por tokens traducidos (dice coefficient + bono si el equipamiento
//      coincide) → automática solo si supera AUTO_THRESHOLD; si no, queda como "sugerencia" que el
//      usuario debe confirmar o descartar en la pantalla de revisión.
// Todo lo que no llega ni a sugerencia razonable se deja para que el usuario lo conecte a mano o lo
// añada como ejercicio nuevo — nunca se inventa una coincidencia de baja confianza en silencio.
import { exercisesList } from "../data/exercises";

const ALIAS_STORAGE_KEY = "exerciseNameAliases";

export const AUTO_THRESHOLD = 0.82;
export const SUGGEST_THRESHOLD = 0.42;

// Traducción palabra a palabra de los términos de gimnasio en inglés más comunes (incluye los que
// usa Hevy en su librería por defecto). No pretende ser un traductor genérico, solo suficiente
// vocabulario de gimnasio para que el matching por tokens funcione bien.
const WORD_TRANSLATIONS = {
  bench: "banca", press: "press", incline: "inclinado", decline: "declinado", flat: "plano",
  chest: "pecho", fly: "apertura", flye: "apertura", flyes: "apertura", crossover: "cruce",
  pullover: "pullover", dip: "fondo", dips: "fondo", pushup: "flexion", "push-up": "flexion",
  "push-ups": "flexion", pushups: "flexion",
  back: "espalda", row: "remo", pulldown: "jalon", pullup: "dominada", "pull-up": "dominada",
  chinup: "dominada", "chin-up": "dominada", deadlift: "muerto", good: "buenos", morning: "dias",
  hyperextension: "hiperextension", shrug: "encogimiento", shrugs: "encogimiento",
  shoulder: "hombro", shoulders: "hombro", overhead: "militar", military: "militar",
  lateral: "lateral", raise: "elevacion", raises: "elevacion", front: "frontal", rear: "posterior",
  face: "cara", pull: "jalon", upright: "menton", arnold: "arnold",
  bicep: "biceps", biceps: "biceps", curl: "curl", curls: "curl", hammer: "martillo",
  preacher: "predicador", concentration: "concentrado", reverse: "inverso", spider: "spider",
  triceps: "triceps", tricep: "triceps", extension: "extension", extensions: "extension",
  skullcrusher: "skullcrusher", kickback: "patada", kickbacks: "patada", french: "frances",
  squat: "sentadilla", squats: "sentadilla", leg: "pierna", legs: "pierna",
  lunge: "zancada", lunges: "zancada", split: "split", stepup: "stepup", "step-up": "stepup",
  hack: "hack", goblet: "goblet", bulgarian: "bulgara", pistol: "pistol",
  hamstring: "femoral", hamstrings: "femoral", romanian: "rumano", stiff: "rigida", nordic: "nordico",
  glute: "gluteo", glutes: "gluteo", hip: "cadera", thrust: "thrust", bridge: "puente",
  calf: "gemelo", calves: "gemelo",
  neck: "cuello", wrist: "muñeca", forearm: "antebrazo",
  ab: "abdominal", abs: "abdominal", abdominal: "abdominal", crunch: "crunch", crunches: "crunch",
  plank: "plancha", situp: "situp", "sit-up": "situp", "sit-ups": "situp", situps: "situp",
  woodchopper: "twist", twist: "twist", russian: "ruso", pallof: "pallof",
  mountain: "escaladores", climbers: "escaladores", climber: "escaladores", burpee: "burpee",
  burpees: "burpee", thruster: "thruster", clean: "cargada", jerk: "envion", snatch: "arrancada",
  swing: "swing", kettlebell: "kettlebell", slam: "balon", slams: "balon", medicine: "medicinal",
  sled: "trineo", push: "empuje", drag: "arrastre",
  seated: "sentado", standing: "pie", lying: "tumbado", single: "unilateral", unilateral: "unilateral",
  one: "una", arm: "brazo", assisted: "asistido", weighted: "lastre",
  wide: "ancho", close: "cerrado", grip: "agarre", narrow: "estrecho", neutral: "neutro",
  treadmill: "cinta", elliptical: "eliptica", bike: "bicicleta", cycling: "ciclismo",
  rowing: "remo", jump: "salto", rope: "comba", stair: "escaladora", stepper: "escaladora",
  boxing: "boxeo", swimming: "natacion", battle: "batalla", ropes: "cuerdas",
  adductor: "aductor", adduction: "aduccion", abductor: "abductor", abduction: "abduccion",
  clamshell: "almeja", "cable-pull-through": "pullthrough",
};

const EQUIPMENT_HINTS = {
  barbell: "barra", ez: "barra", dumbbell: "mancuerna", dumbbells: "mancuerna",
  kettlebell: "mancuerna", plate: "mancuerna", machine: "maquina", smith: "maquina",
  cable: "polea", pulley: "polea", bodyweight: "corporal", band: "corporal",
  assisted: "maquina",
};

// Alias exactos: nombre original del catálogo real de Hevy (en inglés o español, tal cual lo trae
// el CSV exportado) → nombre canónico de data/exercises.js. Autogenerado a partir de la propia
// migración del catálogo (todo par origen/destino donde la traducción cambió el texto) — por eso
// cubre el catálogo casi al completo en vez de una lista de los ejercicios "más comunes" adivinados
// a mano. Todo lo que no está aquí (variaciones de redacción, apps distintas de Hevy) cae al
// matching difuso de más abajo.
const ALIASES = {
  "abdominal bicicleta": "Crunch de Bicicleta",
  "abdominal corto": "Crunch Corto",
  "abdominal corto con cable": "Crunch Corto con Cable",
  "abdominal corto con peso anadido": "Crunch Corto (Con Peso Añadido)",
  "abdominal corto en banco inclinado": "Crunch Corto en Banco Inclinado",
  "abdominal corto en banco inclinado con peso anadido": "Crunch Corto en Banco Inclinado (Con Peso Añadido)",
  "abdominal corto maquina": "Crunch Corto (Máquina)",
  "abdominales bicicleta piernas levantadas": "Crunch de Bicicleta con Piernas Elevadas",
  "abdominales cortos oblicuos": "Crunch Corto Oblicuo",
  "abdominales tijera": "Tijeras Abdominales",
  "abdominales toque al talon": "Abdominales Toque al Talón (Heel Touch)",
  "abduccion de caderas": "Abducción de Caderas (Máquina)",
  "aduccion de caderas": "Aducción de Caderas (Máquina)",
  "aerobics": "Aeróbic",
  "aleteo de piernas": "Aleteo de Piernas (Flutter Kicks)",
  "almeja": "Almeja (Clamshell)",
  "arnold press mancuerna": "Press Arnold (Mancuerna)",
  "ball slams": "Balón Medicinal Contra el Suelo (Ball Slam)",
  "band pullaparts": "Pull-Apart con Banda Elástica",
  "behind the back curl cable": "Curl Detrás de la Espalda (Cable)",
  "belt squat machine": "Sentadilla con Cinturón (Belt Squat)",
  "bicicleta": "Bicicleta Estática",
  "bicicleta de aire": "Bicicleta de Aire (Assault Bike)",
  "cable core palloff press": "Press Pallof en Polea",
  "cable twist down to up": "Twist en Polea de Abajo a Arriba",
  "cable twist up to down": "Twist en Polea de Arriba a Abajo",
  "cables cruzados": "Cruce de Poleas (Cables Cruzados)",
  "cables cruzados de un solo brazo": "Cables Cruzados a Un Solo Brazo",
  "chest fly suspension": "Aperturas en Suspensión (TRX)",
  "cinta": "Cinta de Correr",
  "clean": "Cargada (Clean)",
  "clean and jerk": "Cargada y Envión (Clean and Jerk)",
  "cuerdas de batalla": "Cuerdas de Batalla (Battle Ropes)",
  "curl bayesian": "Curl Bayesiano (Polea)",
  "curl de biceps con cable": "Curl de Bíceps (Cable)",
  "curl de biceps detras de espalda barra": "Curl de Bíceps Detrás de la Espalda (Barra)",
  "curl de concentracion invertido": "Curl de Concentración Inverso",
  "curl de extension de muneca barra": "Extensión de Muñeca (Barra)",
  "curl de muneca palmas arriba": "Curl de Muñeca Palmas Arriba (Barra)",
  "curl de pierna sentado": "Curl de Pierna Sentado (Máquina)",
  "curl invertido barra": "Curl Inverso (Barra)",
  "curl invertido cable": "Curl Inverso (Cable)",
  "curl invertido mancuerna": "Curl Inverso (Mancuerna)",
  "curl sobre cabeza cable": "Curl Sobre la Cabeza (Cable)",
  "curls de concentracion": "Curl de Concentración",
  "curls de piernas de pie": "Curl de Piernas de Pie (Máquina)",
  "curls nordicos de isquiotibiales": "Curl Nórdico de Isquiotibiales",
  "dead hang": "Dead Hang (Colgado en Barra)",
  "dominadas chin up": "Dominadas Supinas (Chin Up)",
  "dominadas chin up asistida": "Dominadas Supinas Asistidas (Chin Up)",
  "dominadas chin up con peso": "Dominadas Supinas con Peso (Chin Up)",
  "dominadas escapulares": "Dominadas Escapulares (Scapular Pull-Up)",
  "drag curl": "Drag Curl (Barra)",
  "dumbbell squeeze press": "Press de Pecho Compresivo con Mancuernas (Squeeze Press)",
  "elevacion de gemelos a una pierna macuerna": "Elevación de Gemelos a Una Pierna (Mancuerna)",
  "elevacion de gemelos de pie smith": "Elevación de Gemelos de Pie (Máquina Smith)",
  "elevacion de rodillas": "Elevación de Rodillas (Cuerpo Entero)",
  "elevacion laterales banda": "Elevación Lateral (Banda)",
  "elevacion laterales cable": "Elevación Lateral (Cable)",
  "elevacion laterales mancuerna": "Elevación Lateral (Mancuerna)",
  "elevacion laterales maquina": "Elevación Lateral (Máquina)",
  "empuje de fuerza": "Empuje de Fuerza (Push Press)",
  "empuje de trineo": "Empuje de Trineo (Sled Push)",
  "equilibrio invertido": "Equilibrio Invertido (Handstand)",
  "escalada": "Escalada (Climbing)",
  "escaladores": "Escaladores (Mountain Climbers)",
  "estocada con mancuerna sobre cabeza": "Estocada con Mancuerna Sobre la Cabeza",
  "extension de espalda hiperextension": "Extensión de Espalda Baja (Hiperextensión)",
  "extension de espalda hiperextension con peso": "Extensión de Espalda Baja (Hiperextensión con Peso)",
  "extension de espalda maquina": "Extensión de Espalda Baja (Máquina)",
  "extension de pierna": "Extensión de Pierna (Máquina)",
  "extension de triceps de un brazo mancuerna": "Extensión de Tríceps a Un Brazo (Mancuerna)",
  "extension triceps suspension": "Extensión de Tríceps (Suspensión)",
  "extensiones a una pierna": "Extensión a Una Pierna (Máquina)",
  "feet up bench press barbell": "Press de Banca con Pies Elevados (Barra)",
  "flexion declinada": "Flexión Declinada (Pies Elevados)",
  "flexion lateral": "Flexión Lateral de Tronco",
  "flexiones de cuello acostado": "Flexión de Cuello Acostado",
  "flexiones de cuello acostado con peso": "Flexión de Cuello Acostado (Con Peso)",
  "flexiones verticales": "Flexiones Verticales (Handstand Push-Up)",
  "fondos en banco": "Fondos en Banco (Bench Dips)",
  "glute ham raise": "Glute Ham Raise (GHR)",
  "hang clean": "Hang Clean (Barra)",
  "hang snatch": "Hang Snatch (Barra)",
  "hip thrust smith machine": "Hip Thrust (Máquina Smith)",
  "hombro posterior": "Hombro Posterior (Mancuerna)",
  "jalon al pecho a un brazo": "Jalón al Pecho a Un Brazo (Cable)",
  "jalon de remo a un brazo": "Jalón de Remo a Un Brazo (Cable)",
  "kettlebell around the world": "Alrededor del Mundo con Pesa Rusa",
  "kettlebell halo": "Halo con Pesa Rusa",
  "landmine sentadilla y press": "Sentadilla y Press con Landmine",
  "lanzamientos de balon": "Lanzamientos de Balón Medicinal",
  "maquina de remo": "Máquina de Remo (Rowing)",
  "maquina escaladora": "Máquina Escaladora (Stair Climber)",
  "overhead plate raise": "Elevación con Disco Sobre la Cabeza",
  "overhead triceps extension cable": "Extensión de Tríceps Sobre la Cabeza (Cable)",
  "partial glute bridge barbell": "Puente de Glúteos Parcial (Barra)",
  "paseo del granjero": "Paseo del Granjero (Farmer's Walk)",
  "patada de triceps": "Patada de Tríceps (Mancuerna)",
  "patadas boca de incendio": "Patadas Boca de Incendio (Fire Hydrant)",
  "perro de caza": "Bird Dog (Perro de Caza)",
  "peso muerto con tiron alto": "Peso Muerto con Tirón Alto (High Pull)",
  "peso muerto sumo": "Peso Muerto Sumo (Barra)",
  "pies a barra": "Pies a la Barra",
  "pinwheel curl dumbbell": "Curl Pinwheel (Mancuerna)",
  "plate curl": "Curl con Disco (Plate Curl)",
  "plate press": "Press con Disco (Plate Press)",
  "plate squeeze svend press": "Compresión de Discos (Svend Press)",
  "postura del perro cabeza abajo": "Postura del Perro Boca Abajo (Downward Dog)",
  "power clean": "Power Clean (Barra)",
  "power snatch": "Power Snatch (Barra)",
  "preacher curl barbell": "Curl Predicador (Barra)",
  "preacher curl dumbbell": "Curl Predicador (Mancuerna)",
  "preacher curl machine": "Curl Predicador (Máquina)",
  "press a una pierna": "Prensa de Piernas a Una Pierna",
  "press de piernas": "Prensa de Piernas",
  "press de piernas sentado": "Prensa de Piernas Sentado",
  "press under": "Press Under (Barra)",
  "puente de gluteos con una pierna": "Puente de Glúteos a Una Pierna",
  "pull over": "Pull Over (Mancuerna)",
  "pulldown lateral con agarre inverso cable": "Jalón Lateral Agarre Invertido (Cable)",
  "rack pull": "Rack Pull (Barra)",
  "rear delt reverse fly dumbbell": "Vuelos Posteriores (Mancuerna Invertida)",
  "rear kick machine": "Patada Trasera (Máquina)",
  "remo alto iso lateral": "Remo Alto Iso-Lateral (Máquina)",
  "remo bajo iso lateral": "Remo Bajo Iso-Lateral (Máquina)",
  "remo en base rotativa": "Remo en Base Rotativa (Landmine)",
  "remo en punta": "Remo en Punta (Barra)",
  "remo invertido": "Remo Invertido (Bodyweight)",
  "remo iso lateral": "Remo Iso-Lateral (Máquina)",
  "remo iso lateral doble": "Remo Iso-Lateral Doble (Máquina)",
  "remo renegado": "Remo Renegado (Mancuernas)",
  "remos meadows barra": "Remo Meadows (Barra)",
  "ring pull up": "Dominada en Anillas (Ring Pull Up)",
  "ring push up": "Flexión en Anillas (Ring Push Up)",
  "rodillas a codos": "Rodillas a Codos (Colgado)",
  "rodillo de antebrazos": "Rueda de Antebrazos (Wrist Roller)",
  "rope straight arm pulldown": "Jalón con Cuerda a Brazos Rectos (Cable)",
  "rueda abdominal": "Rueda Abdominal (Ab Wheel)",
  "salto a la cuerda": "Comba (Saltar la Cuerda)",
  "salto al cajon": "Salto al Cajón (Box Jump)",
  "sentadilla a una pierna": "Sentadilla a una Pierna (Pistol)",
  "sentadilla con remo": "Sentadilla con Remo (Squat Row)",
  "sentadilla delantera": "Sentadilla Delantera (Barra)",
  "sentadilla en pared": "Sentadilla en Pared (Wall Sit)",
  "sentadilla goblet": "Sentadilla Goblet (Mancuerna)",
  "sentadilla hack": "Sentadilla Hack (Máquina)",
  "sentadilla zercher": "Sentadilla Zercher (Barra)",
  "snatch": "Snatch (Arrancada con Barra)",
  "snowboarding": "Snowboard",
  "spiderman": "Spiderman (Plancha con Rodilla a Codo)",
  "split jerk": "Split Jerk (Barra)",
  "straight arm lat pulldown cable": "Jalón con Cuerda a Brazos Rectos de Pie (Cable)",
  "supine press": "Press en Supino (Mancuerna)",
  "tiron a la cara": "Tirón a la Cara (Face Pull)",
  "toque de pies abdominales": "Toque de Pies Abdominal",
  "triceps pressdown": "Extensión de Tríceps en Polea Alta (Barra)",
  "triceps rope pushdown": "Extensión de Tríceps en Polea con Cuerda",
  "triceps sentado": "Tríceps Sentado (Máquina)",
  "trion con polea entre piernas": "Tirón con Polea Entre las Piernas (Cable Pull-Through)",
  "vertical traction machine": "Jalón Vertical a Brazos Rectos (Máquina)",
  "waiter curl dumbbell": "Curl del Camarero (Mancuerna)",
  "wide elbow triceps press dumbbell": "Press de Tríceps Codo Ancho (Mancuerna)",
};

function normalize(str) {
  return (str || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(normalized) {
  return normalized.split(" ").filter(Boolean);
}

function translateTokens(tokens) {
  return tokens.map((tok) => WORD_TRANSLATIONS[tok] || tok);
}

function extractEquipmentHint(originalName) {
  const parenMatch = originalName.match(/\(([^)]+)\)/);
  const scope = parenMatch ? parenMatch[1] : originalName;
  const tokens = tokenize(normalize(scope));
  for (const tok of tokens) {
    if (EQUIPMENT_HINTS[tok]) return EQUIPMENT_HINTS[tok];
  }
  return null;
}

function dice(setA, setB) {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  setA.forEach((tok) => { if (setB.has(tok)) intersection += 1; });
  return (2 * intersection) / (setA.size + setB.size);
}

let catalogIndex = null;
function getCatalogIndex() {
  if (catalogIndex) return catalogIndex;
  catalogIndex = [];
  Object.entries(exercisesList).forEach(([group, list]) => {
    list.forEach((ex) => {
      catalogIndex.push({
        name: ex.name,
        group,
        equipment: ex.equipment,
        tokens: new Set(tokenize(normalize(ex.name))),
      });
    });
  });
  return catalogIndex;
}

function getAliasMap() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(ALIAS_STORAGE_KEY) || "{}");
  } catch (e) {
    return {};
  }
}

export function saveExerciseAlias(foreignName, resolution) {
  if (typeof window === "undefined") return;
  const map = getAliasMap();
  const key = normalize(foreignName);
  if (resolution) {
    map[key] = resolution;
  } else {
    delete map[key];
  }
  localStorage.setItem(ALIAS_STORAGE_KEY, JSON.stringify(map));
}

/**
 * Intenta conectar un nombre de ejercicio "en bruto" (de un CSV importado) con el catálogo de
 * FEEG. Devuelve { name, group, score, method } o null si no hay ninguna pista razonable.
 * `method` es "alias" | "user_alias" | "fuzzy", útil solo para depuración/tests.
 */
export function matchExerciseName(foreignName) {
  if (!foreignName) return null;
  const key = normalize(foreignName);

  const userAliases = getAliasMap();
  if (userAliases[key]) {
    const catalogHit = getCatalogIndex().find((e) => e.name === userAliases[key].name);
    return { ...userAliases[key], score: 1, method: "user_alias", group: catalogHit?.group || userAliases[key].group };
  }

  if (ALIASES[key]) {
    const catalogHit = getCatalogIndex().find((e) => e.name === ALIASES[key]);
    if (catalogHit) return { name: catalogHit.name, group: catalogHit.group, score: 1, method: "alias" };
  }

  const equipmentHint = extractEquipmentHint(foreignName);
  const queryTokens = new Set(translateTokens(tokenize(key)));

  let best = null;
  getCatalogIndex().forEach((candidate) => {
    let score = dice(queryTokens, candidate.tokens);
    if (equipmentHint && candidate.equipment === equipmentHint) score = Math.min(1, score + 0.15);
    if (!best || score > best.score) best = { name: candidate.name, group: candidate.group, score, method: "fuzzy" };
  });

  if (!best || best.score < SUGGEST_THRESHOLD) return null;
  return best;
}

/**
 * Resuelve una lista de nombres de ejercicio únicos. `resolved` mapea nombre-original →
 * { name, group } para todo lo que se pudo conectar automáticamente (alias exacto, alias del
 * usuario, o difuso por encima de AUTO_THRESHOLD). `pending` lleva el resto, con `suggestion` si
 * hay una coincidencia razonable aunque no lo bastante segura para aplicarla sola.
 */
export function resolveExerciseNames(foreignNames) {
  const resolved = {};
  const pending = [];

  foreignNames.forEach((foreignName) => {
    const match = matchExerciseName(foreignName);
    if (match && (match.method !== "fuzzy" || match.score >= AUTO_THRESHOLD)) {
      resolved[foreignName] = { name: match.name, group: match.group };
    } else {
      pending.push({ foreignName, suggestion: match });
    }
  });

  return { resolved, pending };
}
