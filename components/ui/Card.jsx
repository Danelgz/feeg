import { useState } from "react";
import { getTokens } from "../../lib/tokens";

const PADDING = { sm: "14px", md: "20px", lg: "28px" };

export default function Card({
  isDark,
  padding = "md",
  interactive = false,
  onClick,
  style,
  children,
  ...rest
}) {
  const tk = getTokens(isDark);
  const [hover, setHover] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => interactive && setHover(true)}
      onMouseLeave={() => interactive && setHover(false)}
      style={{
        backgroundColor: tk.surface,
        border: `1px solid ${hover && interactive ? tk.accent : tk.border}`,
        borderRadius: tk.radius.lg,
        padding: PADDING[padding] || PADDING.md,
        boxShadow: tk.shadow.card,
        transition: tk.transition,
        cursor: interactive ? "pointer" : "default",
        transform: hover && interactive ? "translateY(-2px)" : "translateY(0)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
