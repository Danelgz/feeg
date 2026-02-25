import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/UserContext';

export default function NumberWheel({ value, onChange, min, max, label, step = 1 }) {
  const scrollRef = useRef(null);
  const { theme } = useUser();
  const isDark = theme === 'dark';
  const isScrolling = useRef(false);
  const scrollTimer = useRef(null);

  const baseOptions = Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => min + i * step);
  const options = [...baseOptions, ...baseOptions, ...baseOptions];

  const itemHeight = 36;
  const visibleItems = 5;
  const containerHeight = itemHeight * visibleItems;

  const scrollToIndex = (idx, smooth = false) => {
    const el = scrollRef.current;
    if (!el) return;
    const targetTop = (baseOptions.length + idx) * itemHeight - (containerHeight / 2) + (itemHeight / 2);
    el.scrollTo({ top: targetTop, behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    if (value !== undefined && baseOptions.includes(value)) {
      const idx = baseOptions.indexOf(value);
      // Use rAF to ensure DOM is ready
      requestAnimationFrame(() => scrollToIndex(idx, false));
    }
  }, []);

  const getSelectedIndex = (scrollTop) => {
    const center = scrollTop + (containerHeight / 2) - (itemHeight / 2);
    return Math.round(center / itemHeight);
  };

  const snapToNearest = (scrollTop) => {
    const el = scrollRef.current;
    if (!el) return;
    const rawIdx = getSelectedIndex(scrollTop);
    const baseLen = baseOptions.length;

    // Infinite loop correction
    let correctedTop = scrollTop;
    if (rawIdx >= baseLen * 2.5) {
      correctedTop = (rawIdx % baseLen) * itemHeight + baseLen * itemHeight - (containerHeight / 2) + (itemHeight / 2);
      el.scrollTop = correctedTop;
    } else if (rawIdx <= baseLen * 0.5) {
      correctedTop = ((rawIdx % baseLen) + baseLen) * itemHeight - (containerHeight / 2) + (itemHeight / 2);
      el.scrollTop = correctedTop;
    }

    const finalIdx = getSelectedIndex(el.scrollTop);
    const actualIdx = ((finalIdx % baseLen) + baseLen) % baseLen;
    if (actualIdx >= 0 && actualIdx < baseLen) {
      onChange(baseOptions[actualIdx]);
    }
  };

  const handleScroll = (e) => {
    const scrollTop = e.target.scrollTop;

    // Update value in real-time for responsiveness
    const rawIdx = getSelectedIndex(scrollTop);
    const baseLen = baseOptions.length;
    const actualIdx = ((rawIdx % baseLen) + baseLen) % baseLen;
    if (actualIdx >= 0 && actualIdx < baseLen) {
      onChange(baseOptions[actualIdx]);
    }

    // Debounce snap-to-nearest
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      snapToNearest(e.target.scrollTop);
    }, 80);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const el = scrollRef.current;
    if (!el) return;
    const direction = e.deltaY > 0 ? 1 : -1;
    el.scrollTop += direction * itemHeight;
  };

  const handleItemClick = (idx) => {
    const el = scrollRef.current;
    if (!el) return;
    const baseLen = baseOptions.length;
    const targetTop = idx * itemHeight - (containerHeight / 2) + (itemHeight / 2);
    el.scrollTo({ top: targetTop, behavior: 'smooth' });
    const actualIdx = idx % baseLen;
    onChange(baseOptions[actualIdx]);
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
        height: `${containerHeight}px`,
        position: "relative",
        userSelect: "none"
      }}>
        {/* Selection highlight */}
        <div style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          height: `${itemHeight}px`,
          transform: "translateY(-50%)",
          backgroundColor: isDark ? "rgba(29, 209, 161, 0.12)" : "rgba(29, 209, 161, 0.1)",
          borderTop: "1px solid rgba(29, 209, 161, 0.4)",
          borderBottom: "1px solid rgba(29, 209, 161, 0.4)",
          pointerEvents: "none",
          zIndex: 2
        }} />

        {/* Top fade */}
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: "40%",
          background: `linear-gradient(to bottom, ${isDark ? "#0f0f0f" : "#f0f0f0"}, transparent)`,
          pointerEvents: "none",
          zIndex: 3
        }} />
        {/* Bottom fade */}
        <div style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0,
          height: "40%",
          background: `linear-gradient(to top, ${isDark ? "#0f0f0f" : "#f0f0f0"}, transparent)`,
          pointerEvents: "none",
          zIndex: 3
        }} />

        {/* Scrollable wheel */}
        <div
          ref={scrollRef}
          onWheel={handleWheel}
          onScroll={handleScroll}
          style={{
            width: "100%",
            height: "100%",
            overflowY: "scroll",
            overflowX: "hidden",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-y",
            backgroundColor: isDark ? "#0f0f0f" : "#f0f0f0",
            borderRadius: "10px",
            border: `1px solid ${isDark ? "#2a2a2a" : "#ddd"}`
          }}
        >
          <style>{`
            div[data-scrollwheel]::-webkit-scrollbar { display: none; }
          `}</style>

          {/* Top spacer */}
          <div style={{ height: `${(containerHeight - itemHeight) / 2}px`, flexShrink: 0 }} />

          {options.map((option, idx) => {
            const baseLen = baseOptions.length;
            const isCenter = option === value;

            return (
              <div
                key={`${option}-${idx}`}
                onClick={() => handleItemClick(idx)}
                style={{
                  height: `${itemHeight}px`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  cursor: "pointer",
                  fontSize: "1rem",
                  fontWeight: isCenter ? "700" : "400",
                  color: isCenter
                    ? "#1dd1a1"
                    : isDark ? "rgba(180, 180, 180, 0.5)" : "rgba(80, 80, 80, 0.5)",
                  transition: "color 0.15s ease, transform 0.15s ease",
                  transform: isCenter ? "scale(1.15)" : "scale(1)",
                  textShadow: isCenter ? "0 0 12px rgba(29, 209, 161, 0.5)" : "none"
                }}
              >
                {option}
              </div>
            );
          })}

          {/* Bottom spacer */}
          <div style={{ height: `${(containerHeight - itemHeight) / 2}px`, flexShrink: 0 }} />
        </div>
      </div>
    </div>
  );
}
