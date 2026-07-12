import { gradientForString, getInitials } from "../../lib/avatarColor";

/** Avatar de usuario: foto si existe, si no iniciales sobre gradiente determinista por nombre. */
export default function Avatar({ photoURL, name, size = 40, style }) {
  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt=""
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, ...style }}
      />
    );
  }

  const [from, to] = gradientForString(name);

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
        fontSize: size * 0.4,
        letterSpacing: "-0.02em",
        ...style,
      }}
    >
      {getInitials(name)}
    </div>
  );
}
