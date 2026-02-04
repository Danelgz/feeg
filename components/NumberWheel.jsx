import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';

export default function NumberWheel({ value, onChange, min, max, label, step = 1 }) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const { theme } = useUser();
  const isDark = theme === 'dark';

  const baseOptions = Array.from({ length: (max - min) / step + 1 }, (_, i) => min + i * step);
  // Crear array con repetición para efecto de bucle infinito
  const options = [...baseOptions, ...baseOptions, ...baseOptions];

  useEffect(() => {
    if (value !== undefined && baseOptions.includes(value)) {
      const idx = baseOptions.indexOf(value);
      setTimeout(() => {
        const wheelElement = document.querySelector(`[data-wheel="${label}"]`);
        if (wheelElement) {
          // Empezar en la segunda repetición para tener arriba y abajo
          wheelElement.scrollTop = (baseOptions.length + idx) * 30 - 60;
        }
      }, 0);
    }
  }, []);

  const handleScroll = (e) => {
    const baseLength = baseOptions.length;
    setScrollPosition(e.target.scrollTop);
    const itemHeight = 30;
    const centerPos = e.target.scrollTop + 60;
    const selectedIdx = Math.round(centerPos / itemHeight);
    
    // Usar módulo para el bucle infinito
    const actualIdx = selectedIdx % baseLength;
    if (actualIdx >= 0 && actualIdx < baseLength) {
      onChange(baseOptions[actualIdx]);
    }

    // Detectar si necesitamos hacer scroll infinito
    if (selectedIdx >= baseLength * 2.5) {
      setTimeout(() => {
        e.target.scrollTop = selectedIdx % baseLength * 30 + baseLength * 30 - 60;
      }, 0);
    } else if (selectedIdx <= baseLength * 0.5) {
      setTimeout(() => {
        e.target.scrollTop = (selectedIdx % baseLength + baseLength) * 30 - 60;
      }, 0);
    }
  };

  return (
    <div style={{ marginBottom: "20px" }}>
      <label style={{ 
        color: isDark ? "#fff" : "#333", 
        display: "block", 
        marginBottom: "8px",
        fontWeight: "600"
      }}>
        {label}
      </label>
      <div style={{
        height: "150px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative"
      }}>
        {/* Área scrollable tipo rueda */}
        <div
          data-wheel={label}
          onWheel={(e) => {
            e.preventDefault();
            const wheelElement = e.currentTarget;
            const scrollSpeed = 30;
            const direction = e.deltaY > 0 ? 1 : -1;
            wheelElement.scrollTop += direction * scrollSpeed;
          }}
          onScroll={handleScroll}
          style={{
            width: "100%",
            height: "100%",
            overflowY: "scroll",
            overflowX: "hidden",
            scrollBehavior: "auto",
            scrollSnapType: "y mandatory",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            backgroundColor: isDark ? "#0f0f0f" : "#f0f0f0",
            borderRadius: "8px",
            border: `1px solid ${isDark ? "#2a2a2a" : "#ddd"}`
          }}
        >
          {/* Espaciador arriba */}
          <div style={{ height: "60px", flexShrink: 0 }} />
          
          {/* Opciones */}
          {options.map((option, idx) => {
            const baseLength = baseOptions.length;
            const itemTop = idx * 30;
            const distanceFromCenter = Math.abs(itemTop - (scrollPosition + 60));
            const isCenter = distanceFromCenter < 20;
            const opacity = 1 - (distanceFromCenter / 160);
            
            return (
              <div
                key={`${option}-${idx}`}
                onClick={() => {
                  const wheelElement = document.querySelector(`[data-wheel="${label}"]`);
                  if (wheelElement) {
                    wheelElement.scrollTop = idx * 30 - 60;
                    // Actualizar valor inmediatamente
                    const actualIdx = idx % baseLength;
                    onChange(baseOptions[actualIdx]);
                  }
                }}
                style={{
                  height: "30px",
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  cursor: "pointer",
                  scrollSnapAlign: "center",
                  scrollSnapStop: "always",
                  fontSize: isCenter ? "0.95rem" : "0.75rem",
                  fontWeight: isCenter ? "700" : "400",
                  color: isCenter ? "#1dd1a1" : (isDark ? `rgba(170, 170, 170, ${Math.max(0.3, opacity)})` : `rgba(102, 102, 102, ${Math.max(0.3, opacity)})`),
                  transition: "all 0.15s ease",
                  textShadow: isCenter ? "0 0 10px rgba(29, 209, 161, 0.4)" : "none",
                  transform: isCenter ? "scale(1.1)" : "scale(1)"
                }}
              >
                {option}
              </div>
            );
          })}

          {/* Espaciador abajo */}
          <div style={{ height: "60px", flexShrink: 0 }} />
        </div>
      </div>
    </div>
  );
}
