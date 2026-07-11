import { ICONS } from "../../data/icons";

const TAGS = {
  path: "path",
  polyline: "polyline",
  polygon: "polygon",
  line: "line",
  circle: "circle",
  rect: "rect",
};

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
