// Avatar por iniciales + gradiente determinista por nombre — compartido entre ExerciseThumb
// (ejercicios) y Avatar (usuarios) para no duplicar la paleta ni el hash en dos sitios.

export const AVATAR_GRADIENTS = [
  ["#2EE6C5", "#1aa88f"],
  ["#7c5cff", "#4a2fd6"],
  ["#ff9f43", "#e0721c"],
  ["#ff5e7e", "#c72a4a"],
  ["#4fa8ff", "#2361c9"],
  ["#ffd23f", "#d9a800"],
];

export function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getInitials(name) {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function gradientForString(str) {
  const idx = hashString(str || "") % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[idx];
}
