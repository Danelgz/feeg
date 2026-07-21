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

// Nombres habituales de la librería por defecto de Hevy (inglés) → nombre exacto del catálogo de
// FEEG. Cubre los movimientos más comunes; todo lo que no está aquí cae al matching difuso.
const ALIASES = {
  "bench press barbell": "Press de banca plano con barra",
  "incline bench press barbell": "Press de banca inclinado con barra",
  "decline bench press barbell": "Press de banca declinado con barra",
  "bench press dumbbell": "Press de banca plano con mancuernas",
  "incline bench press dumbbell": "Press de banca inclinado con mancuernas",
  "decline bench press dumbbell": "Press de banca declinado con mancuernas",
  "chest press machine": "Press de pecho en máquina",
  "chest fly dumbbell": "Aperturas con mancuernas en banco plano",
  "incline chest fly dumbbell": "Aperturas con mancuernas en banco inclinado",
  "chest fly machine": "Aperturas en máquina (pec deck)",
  "cable fly crossover": "Cruce de poleas (crossover)",
  "cable crossover": "Cruce de poleas (crossover)",
  "push up": "Flexiones de brazos",
  "push ups": "Flexiones de brazos",
  "weighted push up": "Flexiones con lastre",
  "dip": "Fondos en paralelas (pecho)",
  "chest dip": "Fondos en paralelas (pecho)",
  "assisted chest dip machine": "Fondos asistidos en máquina (pecho)",

  "pull up": "Dominadas pronas (agarre ancho)",
  "pull ups": "Dominadas pronas (agarre ancho)",
  "chin up": "Dominadas supinas",
  "chin ups": "Dominadas supinas",
  "assisted pull up machine": "Dominadas asistidas en máquina",
  "lat pulldown cable": "Jalón al pecho agarre ancho",
  "close grip lat pulldown cable": "Jalón al pecho agarre cerrado",
  "seated row cable": "Remo en polea baja sentado",
  "bent over row barbell": "Remo con barra",
  "pendlay row barbell": "Remo con barra desde el suelo (Pendlay)",
  "one arm row dumbbell": "Remo con mancuerna a una mano",
  "single arm row dumbbell": "Remo con mancuerna a una mano",
  "bent over row dumbbell": "Remo con mancuernas apoyado en banco",
  "t bar row": "Remo en barra T",
  "inverted row bodyweight": "Remo invertido en barra (bodyweight)",
  "deadlift barbell": "Peso muerto convencional",
  "sumo deadlift barbell": "Peso muerto sumo",
  "trap bar deadlift": "Peso muerto con trap bar",
  "hyperextension bodyweight": "Hiperextensiones en banco lumbar",
  "back extension machine": "Extensión lumbar en máquina",
  "shrug barbell": "Encogimientos con barra (shrugs)",
  "shrug dumbbell": "Encogimientos con mancuernas",

  "overhead press barbell": "Press militar con barra",
  "shoulder press barbell": "Press militar con barra",
  "shoulder press dumbbell": "Press militar con mancuernas",
  "arnold press dumbbell": "Press Arnold con mancuernas",
  "shoulder press machine": "Press de hombro en máquina",
  "lateral raise dumbbell": "Elevaciones laterales con mancuernas",
  "lateral raise cable": "Elevaciones laterales en polea",
  "lateral raise machine": "Elevaciones laterales en máquina",
  "front raise dumbbell": "Elevaciones frontales con mancuernas",
  "front raise barbell": "Elevaciones frontales con barra",
  "rear delt fly dumbbell": "Elevación posterior con mancuernas (pájaros)",
  "reverse fly machine": "Elevación posterior en máquina (reverse pec deck)",
  "face pull cable": "Face pull en polea",
  "upright row barbell": "Remo al mentón con barra",
  "upright row cable": "Remo al mentón en polea",

  "bicep curl barbell": "Curl con barra recta",
  "bicep curl dumbbell": "Curl alterno con mancuernas",
  "hammer curl dumbbell": "Curl martillo con mancuernas",
  "concentration curl dumbbell": "Curl concentrado",
  "preacher curl barbell": "Curl predicador con barra Z (banco Scott)",
  "preacher curl dumbbell": "Curl predicador con mancuerna",
  "cable curl": "Curl en polea baja con barra",
  "bicep curl machine": "Curl en máquina",
  "reverse curl barbell": "Curl inverso con barra",

  "tricep dip bodyweight": "Fondos en banco (bench dips)",
  "bench dip": "Fondos en banco (bench dips)",
  "close grip bench press barbell": "Press de banca agarre cerrado",
  "skullcrusher barbell": "Press francés con barra Z",
  "lying tricep extension barbell": "Press francés con barra Z",
  "tricep extension dumbbell": "Press francés con mancuerna",
  "tricep pushdown cable": "Extensión de tríceps en polea alta con cuerda",
  "tricep extension cable": "Extensión de tríceps en polea alta con barra",
  "overhead tricep extension dumbbell": "Extensión de tríceps sobre la cabeza con mancuerna",
  "overhead tricep extension cable": "Extensión de tríceps sobre la cabeza en polea",
  "tricep kickback dumbbell": "Patada de tríceps con mancuerna",
  "tricep extension machine": "Tríceps en máquina",

  "squat barbell": "Sentadilla trasera con barra",
  "front squat barbell": "Sentadilla frontal con barra",
  "bulgarian split squat dumbbell": "Sentadilla búlgara con mancuernas",
  "goblet squat dumbbell": "Sentadilla goblet con mancuerna",
  "hack squat machine": "Sentadilla hack en máquina",
  "squat smith machine": "Sentadilla en multipower",
  "leg press": "Prensa de piernas inclinada",
  "leg press machine": "Prensa de piernas inclinada",
  "walking lunge dumbbell": "Zancadas caminando con mancuernas",
  "lunge dumbbell": "Zancadas frontales con mancuernas",
  "reverse lunge dumbbell": "Zancadas inversas con mancuernas",
  "step up dumbbell": "Step-up con mancuernas",
  "leg extension machine": "Extensión de cuádriceps en máquina",
  "squat bodyweight": "Sentadilla sin peso (bodyweight)",
  "pistol squat bodyweight": "Sentadilla pistol asistida",
  "box jump": "Salto al cajón (box jump)",

  "romanian deadlift barbell": "Peso muerto rumano con barra",
  "romanian deadlift dumbbell": "Peso muerto rumano con mancuernas",
  "stiff leg deadlift barbell": "Peso muerto piernas rígidas",
  "single leg deadlift dumbbell": "Peso muerto a una pierna con mancuerna",
  "good morning barbell": "Buenos días con barra",
  "lying leg curl machine": "Curl femoral tumbado en máquina",
  "seated leg curl machine": "Curl femoral sentado en máquina",
  "standing leg curl machine": "Curl femoral de pie en máquina",
  "nordic curl bodyweight": "Curl nórdico",

  "hip thrust barbell": "Hip thrust con barra",
  "hip thrust machine": "Hip thrust en máquina",
  "glute bridge bodyweight": "Puente de glúteo",
  "cable kickback": "Patada de glúteo en polea (cable kickback)",
  "reverse hyperextension machine": "Reverse hyperextension en máquina",
  "frog pump bodyweight": "Frog pump",
  "cable pull through": "Cable pull-through",
  "bird dog bodyweight": "Bird dog",

  "standing calf raise machine": "Elevación de talones de pie en máquina",
  "seated calf raise machine": "Elevación de talones sentado en máquina",
  "calf press leg press": "Elevación de talones en prensa de piernas",
  "calf raise smith machine": "Elevación de talones en multipower",
  "calf raise bodyweight": "Elevación de talones de pie (bodyweight)",

  "crunch bodyweight": "Crunch abdominal",
  "crunch machine": "Crunch en máquina",
  "cable crunch": "Crunch con cable en polea alta",
  "hanging leg raise": "Elevación de piernas colgado",
  "hanging knee raise": "Elevación de rodillas colgado",
  "ab wheel": "Rueda abdominal (ab wheel)",
  "plank bodyweight": "Plancha frontal",
  "side plank bodyweight": "Plancha lateral",
  "bicycle crunch": "Crunch de bicicleta",
  "flutter kicks": "Tijeras abdominales",
  "pallof press cable": "Press Pallof en polea",
  "russian twist": "Giro ruso con disco (Russian twist)",
  "lying leg raise": "Elevación de piernas tumbado",
  "sit up": "Abdominales completos (sit-up)",
  "sit ups": "Abdominales completos (sit-up)",
  "dead bug": "Dead bug",
  "mountain climber": "Escaladores (mountain climbers)",
  "mountain climbers": "Escaladores (mountain climbers)",

  "treadmill": "Cinta de correr",
  "elliptical trainer": "Elíptica",
  "stationary bike": "Bicicleta estática",
  "spinning bike": "Bicicleta de spinning",
  "rowing machine": "Máquina de remo (rowing)",
  "stair climber": "Escaladora (stair climber)",
  "jump rope": "Comba (saltar la cuerda)",
  "assault bike": "Bicicleta de aire (assault bike)",
  "battle ropes": "Cuerdas de batalla (battle ropes)",
  "boxing": "Boxeo",
  "swimming": "Natación",
  "cycling": "Ciclismo en carretera",

  "hip adduction machine": "Máquina de aductores",
  "cable hip adduction": "Aducción de cadera en polea",
  "hip abduction machine": "Máquina de abductores",
  "cable hip abduction": "Abducción de cadera en polea",
  "banded lateral walk": "Caminata lateral con banda elástica",
  "clamshell": "Almeja con banda elástica (clamshell)",

  "wrist curl barbell": "Curl de muñeca con barra",
  "reverse wrist curl barbell": "Extensión de muñeca con barra",
  "wrist curl dumbbell": "Curl de muñeca con mancuerna",
  "wrist roller": "Rueda de antebrazo (wrist roller)",

  "burpee": "Burpee",
  "burpees": "Burpee",
  "power clean": "Cargada de potencia (power clean)",
  "clean and jerk": "Cargada y envión (clean and jerk)",
  "medicine ball slam": "Balón medicinal contra el suelo (ball slam)",
  "kettlebell swing": "Swing con kettlebell",
  "thruster barbell": "Thruster con barra",
  "sled push": "Arrastre de trineo (sled push/pull)",
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
