import { useState } from "react";
import { FRONT_PATHS, BACK_PATHS } from "../data/bodyPaths";

export default function BodyHeatmap({
  counts = {},
  manualLevels = {},
  onMuscleClick = () => {},
  isDark = false
}) {
  const [side, setSide] = useState("front");

  const paths = side === "front" ? FRONT_PATHS : BACK_PATHS;

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
      <div style={{ marginBottom: 15, display: "flex", justifyContent: "center", gap: 10 }}>
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

      <div style={{ display: "flex", justifyContent: "center" }}>
        <svg
          viewBox="0 0 100 220"
          width="100%"
          style={{ 
            maxWidth: 320, 
            background: isDark ? "#0a0a0a" : "#fafafa",
            borderRadius: "16px",
            padding: "25px",
            border: `1px solid ${isDark ? "#2a2a2a" : "#e8e8e8"}`,
            boxShadow: isDark ? "0 4px 12px rgba(0,0,0,0.4)" : "0 4px 12px rgba(0,0,0,0.08)"
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
                  stroke={isDark ? "#fff" : "#000"}
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  onClick={() => onMuscleClick(muscle)}
                  style={{ cursor: "pointer", transition: "fill 0.3s ease" }}
                />
              );
            })
          )}

          {/* Líneas grises para delinear músculos */}
          {/* Separación vertical central */}
          <line x1="50" y1="37" x2="50" y2="190" stroke="#888888" strokeWidth="0.6" opacity="0.4" />
          
          {/* Líneas horizontales para separar grupos musculares */}
          <line x1="20" y1="37" x2="80" y2="37" stroke="#888888" strokeWidth="0.5" opacity="0.3" />
          <line x1="18" y1="50" x2="82" y2="50" stroke="#888888" strokeWidth="0.5" opacity="0.3" />
          <line x1="15" y1="105" x2="85" y2="105" stroke="#888888" strokeWidth="0.5" opacity="0.3" />
          <line x1="20" y1="155" x2="80" y2="155" stroke="#888888" strokeWidth="0.5" opacity="0.3" />
          
          {/* Separaciones entre brazos y torso */}
          <line x1="28" y1="35" x2="28" y2="100" stroke="#888888" strokeWidth="0.5" opacity="0.3" />
          <line x1="72" y1="35" x2="72" y2="100" stroke="#888888" strokeWidth="0.5" opacity="0.3" />
          
          {/* Separaciones entre cuádriceps */}
          <line x1="41" y1="105" x2="41" y2="155" stroke="#888888" strokeWidth="0.5" opacity="0.3" />
          <line x1="59" y1="105" x2="59" y2="155" stroke="#888888" strokeWidth="0.5" opacity="0.3" />
          
          {/* Cara mejorada */}
          {/* Ojos */}
          <circle cx="44" cy="7" r="1.5" fill="#333333" />
          <circle cx="56" cy="7" r="1.5" fill="#333333" />
          
          {/* Cejas */}
          <line x1="42" y1="5" x2="46" y2="4.5" stroke="#555555" strokeWidth="0.8" />
          <line x1="54" y1="4.5" x2="58" y2="5" stroke="#555555" strokeWidth="0.8" />
          
          {/* Nariz */}
          <line x1="50" y1="7" x2="50" y2="11" stroke="#666666" strokeWidth="0.7" />
          <circle cx="48.5" cy="11" r="0.6" fill="#888888" />
          <circle cx="51.5" cy="11" r="0.6" fill="#888888" />
          
          {/* Boca */}
          <path d="M 45 14 Q 50 15 55 14" stroke="#777777" strokeWidth="0.8" fill="none" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
