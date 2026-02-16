import React from 'react';
import { INTERACTIVE_FRONT_PATHS, INTERACTIVE_BACK_PATHS } from '../data/interactiveBodyPaths';

export default function BodyStatsSVG({ 
  muscleStats = {}, 
  manualLevels = {}, 
  onMuscleClick = () => {},
  isDark = false 
}) {
  const { counts = {}, getColor = () => {}, getIntensity = () => {} } = muscleStats;

  const renderPaths = (pathMap) => {
    return Object.entries(pathMap).map(([muscle, paths]) => {
      const intensity = manualLevels[muscle] !== undefined 
        ? manualLevels[muscle] 
        : getIntensity(counts[muscle] || 0);
      
      const style = {
        fill: getColor(intensity) || (intensity > 0 ? '#1dd1a1' : (isDark ? '#222' : '#eee')),
        fillOpacity: intensity > 0 ? 0.8 : 0.2,
        stroke: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
        strokeWidth: "0.5",
        cursor: 'pointer',
        transition: 'all 0.3s ease'
      };

      return paths.map((d, i) => (
        <path
          key={`${muscle}-${i}`}
          d={d}
          style={style}
          onClick={() => onMuscleClick(muscle)}
          title={muscle}
        />
      ));
    });
  };

  return (
    <div style={{ width: '100%', overflowX: 'auto', display: 'flex', justifyContent: 'center' }}>
      <svg
        version="1.1"
        id="body-stats-svg"
        width="100%"
        height="100%"
        viewBox="160 120 1140 1150"
        style={{ maxWidth: '800px', height: 'auto', minWidth: '600px' }}
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
      >
        <image
          width="1500"
          height="1300"
          preserveAspectRatio="xMidYMid slice"
          xlinkHref="/Cuerpo.png"
          id="body-bg"
          x="0"
          y="0"
          style={{ opacity: 0.8 }}
        />
        <g id="front-muscles">
          {renderPaths(INTERACTIVE_FRONT_PATHS)}
        </g>
        <g id="back-muscles">
          {renderPaths(INTERACTIVE_BACK_PATHS)}
        </g>
      </svg>
    </div>
  );
}
