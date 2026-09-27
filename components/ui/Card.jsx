import { getTokens } from "../../lib/tokens";

const PADDING = { sm: "14px", md: "20px", lg: "28px" };

export default function Card({
  isDark,
  padding = "md",
  interactive = false,
  onClick,
  style,
  className = "",
  children,
  ...rest
}) {
  const tk = getTokens(isDark);

  // Igual que Button: los colores van como variables CSS para que las reglas :hover/:active de
  // InteractionStyles puedan cambiarlos (un `style` inline les ganaría). Una tarjeta es una
  // superficie grande, así que escala menos al pulsar que un botón — a 0.96 se deformaría.
  return (
    <div
      onClick={onClick}
      className={`feeg-surface ${interactive ? "feeg-press feeg-hover feeg-lift" : ""} ${className}`.trim()}
      style={{
        borderRadius: tk.radius.lg,
        padding: PADDING[padding] || PADDING.md,
        cursor: interactive ? "pointer" : "default",
        // Relleno sin contorno: los bordes de 1px en cada tarjeta recargaban las pantallas. En
        // claro, una sombra mínima separa la tarjeta del fondo gris.
        "--feeg-bg": isDark ? "rgba(255,255,255,0.045)" : "#fff",
        "--feeg-border": "transparent",
        "--feeg-shadow": isDark ? "none" : "0 1px 3px rgba(24,32,44,0.06)",
        ...(interactive
          ? {
              "--feeg-hover-bg": isDark ? "rgba(255,255,255,0.07)" : "#fff",
              "--feeg-hover-border": tk.accent,
              "--feeg-lift-shadow": tk.shadow.float,
              "--feeg-press-scale": 0.985,
            }
          : {}),
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
