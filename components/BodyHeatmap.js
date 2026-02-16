import { FRONT_PATHS, BACK_PATHS } from "../data/bodyPaths";

export default function BodyHeatmap({
  counts = {},
  manualLevels = {},
  onMuscleClick = () => {},
  isDark = false
}) {
  const getIntensity = (value) => {
    if (value >= 10) return 4;
    if (value >= 6) return 3;
    if (value >= 3) return 2;
    if (value >= 1) return 1;
    return 0;
  };

  const getColor = (level) => {
    if (level === 0) return isDark ? "#262626" : "#e0e0e0";
    switch (level) {
      case 1: return "#0a4231";
      case 2: return "#147a5b";
      case 3: return "#2fd6a2";
      case 4: return "#84fcdb";
      default: return isDark ? "#262626" : "#e0e0e0";
    }
  };

  const renderFigure = (paths, offsetX = 0) => (
    <g transform={`translate(${offsetX}, 30)`}>
      {Object.entries(paths).map(([muscle, list]) =>
        list.map((d, i) => {
          const level =
            manualLevels[muscle] ??
            getIntensity(counts[muscle] || 0);

          return (
            <path
              key={muscle + i}
              d={d}
              fill={getColor(level)}
              stroke={isDark ? "#000" : "#fff"}
              strokeWidth="0.5"
              onClick={() => onMuscleClick(muscle)}
              style={{ cursor: "pointer", transition: "fill 0.3s ease" }}
            >
              <title>{muscle}</title>
            </path>
          );
        })
      )}
    </g>
  );

  return (
    <div style={{ textAlign: "center", width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <svg
          viewBox="0 0 220 260"
          width="100%"
          style={{ 
            maxWidth: 600, 
            background: isDark ? "#000" : "#f9f9f9",
            borderRadius: "20px",
            padding: "20px",
            border: `1px solid ${isDark ? "#1a1a1a" : "#eee"}`
          }}
        >
          {/* Labels */}
          <text x="50" y="12" textAnchor="middle" fill={isDark ? "#777" : "#555"} fontSize="10" fontWeight="bold" letterSpacing="2">FRONTAL</text>
          <text x="160" y="12" textAnchor="middle" fill={isDark ? "#777" : "#555"} fontSize="10" fontWeight="bold" letterSpacing="2">POSTERIOR</text>

          {/* Front Figure */}
          {renderFigure(FRONT_PATHS, 0)}

          {/* Back Figure */}
          {renderFigure(BACK_PATHS, 110)}
        </svg>
      </div>
    </div>
  );
}
