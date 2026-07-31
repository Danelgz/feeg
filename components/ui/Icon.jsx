import { ICONS } from "../../data/icons";

const TAGS = {
  path: "path",
  polyline: "polyline",
  polygon: "polygon",
  line: "line",
  circle: "circle",
  rect: "rect",
};

/**
 * Los tipos van en JSDoc y no se dejan a la inferencia porque este archivo es .jsx y lo consumen
 * pantallas .tsx: sin anotar, TypeScript da por OBLIGATORIA cualquier prop sin valor por defecto
 * (`style`), y anotarla con `= undefined` es peor todavía — infiere el tipo literal `undefined` y
 * entonces pasarle estilos deja de compilar. El componente no se migra a TS porque lo usa media app
 * y eso es una migración, no un efecto secundario de tocar los rangos.
 *
 * @param {{
 *   name: string,
 *   size?: number,
 *   color?: string,
 *   strokeWidth?: number,
 *   style?: import("react").CSSProperties,
 * } & Record<string, any>} props
 */
export default function Icon({ name, size = 24, color = "currentColor", strokeWidth = 2, style, ...rest }) {
  const shapes = ICONS[name];
  if (!shapes) return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, display: "block", ...style }}
      {...rest}
    >
      {shapes.map((shape, i) => {
        const Tag = TAGS[shape.tag];
        if (!Tag) return null;
        const { tag, ...props } = shape;
        return <Tag key={i} {...props} />;
      })}
    </svg>
  );
}
