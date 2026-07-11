import { useState } from "react";
import { getTokens } from "../../lib/tokens";
import Icon from "./Icon";

const SIZES = {
  sm: { padding: "8px 14px", fontSize: "0.8rem", radius: "8px", iconSize: 16 },
  md: { padding: "12px 20px", fontSize: "0.9rem", radius: "10px", iconSize: 18 },
  lg: { padding: "14px 24px", fontSize: "1rem", radius: "12px", iconSize: 20 },
};

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
  ...rest
}) {
  const tk = getTokens(isDark);
  const [hover, setHover] = useState(false);
  const dims = SIZES[size] || SIZES.md;

  const variants = {
    primary: {
      base: { backgroundColor: tk.accent, color: tk.onAccent, border: "none" },
      hover: { backgroundColor: tk.accentHover },
    },
    secondary: {
      base: { backgroundColor: "transparent", color: tk.text, border: `1px solid ${tk.border}` },
      hover: { borderColor: tk.accent, color: tk.accent },
    },
    danger: {
      base: { backgroundColor: tk.danger, color: "#fff", border: "none" },
      hover: { backgroundColor: tk.dangerHover },
    },
    ghost: {
      base: { backgroundColor: "transparent", color: tk.textMuted, border: "none" },
      hover: { color: tk.accent, backgroundColor: tk.surfaceHover },
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
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        padding: dims.padding,
        fontSize: dims.fontSize,
        borderRadius: dims.radius,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        width: fullWidth ? "100%" : "auto",
        transition: tk.transition,
        whiteSpace: "nowrap",
        ...v.base,
        ...(hover && !disabled ? v.hover : {}),
        ...style,
      }}
      {...rest}
    >
      {content}
    </button>
  );
}
