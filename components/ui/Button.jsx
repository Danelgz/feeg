import { getTokens } from "../../lib/tokens";
import Icon from "./Icon";

const SIZES = {
  sm: { padding: "8px 14px", fontSize: "0.8rem", radius: "8px", iconSize: 16, press: 0.94 },
  md: { padding: "12px 20px", fontSize: "0.9rem", radius: "10px", iconSize: 18, press: 0.96 },
  lg: { padding: "14px 24px", fontSize: "1rem", radius: "12px", iconSize: 20, press: 0.975 },
};

/**
 * Tipos en JSDoc por la misma razón que en Icon.jsx: `icon` y `style` no tienen valor por
 * defecto, así que sin anotar TypeScript los infiere OBLIGATORIOS para cualquier consumidor .tsx
 * — un botón de solo texto sin icono dejaría de compilar.
 *
 * @param {{
 *   isDark: boolean,
 *   variant?: "primary" | "secondary" | "danger" | "ghost",
 *   size?: "sm" | "md" | "lg",
 *   fullWidth?: boolean,
 *   disabled?: boolean,
 *   icon?: string | import("react").ReactNode,
 *   iconPosition?: "left" | "right",
 *   type?: "button" | "submit" | "reset",
 *   onClick?: (event: import("react").MouseEvent<HTMLButtonElement>) => void,
 *   children?: import("react").ReactNode,
 *   style?: import("react").CSSProperties,
 *   className?: string,
 * } & Record<string, any>} props
 */
export default function Button({
  isDark,
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  icon,
  iconPosition = "left",
  type = "button",
  onClick,
  children,
  style,
  className = "",
  ...rest
}) {
  const tk = getTokens(isDark);
  const dims = SIZES[size] || SIZES.md;

  // Los colores se entregan como variables CSS, no como propiedades pintadas inline: un `style`
  // inline gana siempre a una hoja de estilos, así que si `backgroundColor` se pusiera aquí, las
  // reglas :hover/:active de InteractionStyles no podrían cambiarlo. Ver la nota de contrato ahí.
  const variants = {
    primary: {
      "--feeg-bg": tk.accent,
      "--feeg-fg": tk.onAccent,
      "--feeg-hover-bg": tk.accentHover,
    },
    secondary: {
      "--feeg-bg": "transparent",
      "--feeg-fg": tk.text,
      "--feeg-border": tk.border,
      "--feeg-hover-fg": tk.accent,
      "--feeg-hover-border": tk.accent,
    },
    danger: {
      "--feeg-bg": tk.danger,
      "--feeg-fg": "#fff",
      "--feeg-hover-bg": tk.dangerHover,
    },
    ghost: {
      "--feeg-bg": "transparent",
      "--feeg-fg": tk.textMuted,
      "--feeg-hover-bg": tk.surfaceHover,
      "--feeg-hover-fg": tk.accent,
    },
  };

  const v = variants[variant] || variants.primary;

  const content = (
    <>
      {icon && iconPosition === "left" && (typeof icon === "string" ? <Icon name={icon} size={dims.iconSize} /> : icon)}
      {children}
      {icon && iconPosition === "right" && (typeof icon === "string" ? <Icon name={icon} size={dims.iconSize} /> : icon)}
    </>
  );

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`feeg-surface feeg-press feeg-hover ${className}`.trim()}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: tk.space.sm,
        padding: dims.padding,
        fontSize: dims.fontSize,
        borderRadius: dims.radius,
        fontWeight: tk.weight.medium,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        width: fullWidth ? "100%" : "auto",
        whiteSpace: "nowrap",
        "--feeg-press-scale": dims.press,
        "--feeg-border-width": variant === "secondary" ? "1px" : "0px",
        ...v,
        ...style,
      }}
      {...rest}
    >
      {content}
    </button>
  );
}
