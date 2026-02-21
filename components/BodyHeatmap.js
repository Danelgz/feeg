import { useState } from "react";
import { bodyTypes } from "../data/bodyPaths";

export default function BodyHeatmap({
  counts = {},
  manualLevels = {},
  onMuscleClick = () => {},
  isDark = false
}) {
  const [side, setSide] = useState("front");
  const [selectedBodyType, setSelectedBodyType] = useState("man1");

  const currentBodyType = bodyTypes[selectedBodyType];
  const paths = side === "front" ? currentBodyType.front : currentBodyType.back;

  const getIntensity = (value) => {
    if (value >= 10) return 4;
    if (value >= 6) return 3;
    if (value >= 3) return 2;
    if (value >= 1) return 1;
    return 0;
  };

  const getColor = (level) => {
    switch (level) {
      case 4: return "#ff2b2b";
      case 3: return "#ff7a2b";
      case 2: return "#ffd12b";
      case 1: return "#9cff2b";
      default: return "#2fd6a2";
    }
  };

  return (
    <div style={{ textAlign: "center", width: "100%" }}>
      <div style={{ marginBottom: 15, display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
        <button 
          onClick={() => setSide("front")}
          style={{
            padding: "8px 16px",
            backgroundColor: side === "front" ? "#1dd1a1" : (isDark ? "#333" : "#ddd"),
            color: side === "front" ? "#000" : (isDark ? "#fff" : "#000"),
            border: "none",
            borderRadius: "20px",
            cursor: "pointer",
            fontWeight: "bold"
          }}
        >
          Frontal
        </button>
        <button 
          onClick={() => setSide("back")}
          style={{
            padding: "8px 16px",
            backgroundColor: side === "back" ? "#1dd1a1" : (isDark ? "#333" : "#ddd"),
            color: side === "back" ? "#000" : (isDark ? "#fff" : "#000"),
            border: "none",
            borderRadius: "20px",
            cursor: "pointer",
            fontWeight: "bold"
          }}
        >
          Posterior
        </button>
      </div>

      <div style={{ marginBottom: 15, display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
        {Object.entries(bodyTypes).map(([key, value]) => (
          <button
            key={key}
            onClick={() => setSelectedBodyType(key)}
            style={{
              padding: "8px 16px",
              backgroundColor: selectedBodyType === key ? "#008CFF" : (isDark ? "#333" : "#ddd"),
              color: selectedBodyType === key ? "#fff" : (isDark ? "#fff" : "#000"),
              border: "none",
              borderRadius: "20px",
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            {value.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <svg
          viewBox="0 0 100 220"
          width="100%"
          style={{ 
            maxWidth: 300, 
            background: isDark ? "#111" : "#f9f9f9",
            borderRadius: "20px",
            padding: "20px",
            border: `1px solid ${isDark ? "#333" : "#eee"}`
          }}
        >
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
                />
              );
            })
          )}
        </svg>
      </div>
    </div>
  );
}
