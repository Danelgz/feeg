// Sustituye el <img src="/exercises/{nombre}.png"> que existía en 4 sitios distintos apuntando
// a una carpeta que no existe (siempre caía al fallback). Avatar por iniciales + gradiente
// determinista por nombre — sin requests de red, identidad visual real ya mismo.

const GRADIENTS = [
  ["#2EE6C5", "#1aa88f"],
  ["#7c5cff", "#4a2fd6"],
  ["#ff9f43", "#e0721c"],
  ["#ff5e7e", "#c72a4a"],
  ["#4fa8ff", "#2361c9"],
  ["#ffd23f", "#d9a800"],
];

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getInitials(name) {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export default function ExerciseThumb({ name, size = 45 }) {
  const idx = hashString(name || "") % GRADIENTS.length;
  const [from, to] = GRADIENTS[idx];

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `linear-gradient(135deg, ${from}, ${to})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        color: "#000",
        fontWeight: 800,
        fontSize: size * 0.36,
        letterSpacing: "-0.02em",
      }}
    >
      {getInitials(name)}
    </div>
  );
}
