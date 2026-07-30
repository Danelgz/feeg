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
        "--feeg-bg": tk.surface,
        "--feeg-border": tk.border,
        "--feeg-shadow": tk.shadow.card,
        ...(interactive
          ? {
              "--feeg-hover-bg": tk.surface,
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
