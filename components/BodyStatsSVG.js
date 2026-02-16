import React from 'react';

export default function BodyStatsSVG({ 
  muscleStats = {}, 
  manualLevels = {}, 
  onMuscleClick = () => {},
  isDark = false 
}) {
  const { counts = {}, getColor = () => {}, getIntensity = () => {} } = muscleStats;

  const getMuscleStyle = (muscleId) => {
    const intensity = manualLevels[muscleId] !== undefined 
      ? manualLevels[muscleId] 
      : getIntensity(counts[muscleId] || 0);
    
    return {
      fill: getColor(intensity) || (intensity > 0 ? '#1dd1a1' : (isDark ? '#333' : '#eee')),
      opacity: intensity > 0 ? 0.8 : 0.3,
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'inline'
    };
  };

  return (
    <svg
      version="1.1"
      id="svg1"
      width="100%"
      height="100%"
      viewBox="0 0 1008 1056"
      style={{ maxWidth: '500px', height: 'auto' }}
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
    >
      <defs id="defs1" />
      <g id="g1">
        <image
          width="1008"
          height="1056"
          preserveAspectRatio="none"
          xlinkHref="/Cuerpo.png"
          id="image1"
          x="4.940351"
          y="-23.466667"
          style={{ opacity: 0.9 }}
        />
        {/* Abdomen / capaabs */}
        <path
          style={getMuscleStyle('Abdomen')}
          d="m 251.03158,534.48421 1.54386,-85.52982 -32.42105,-2.77895 9.57193,61.75439 z"
          id="path4"
          onClick={() => onMuscleClick('Abdomen')}
        />
        {/* Other path from user SVG - mapping to a guess or keeping it as path5 */}
        <path
          style={getMuscleStyle('Pecho')}
          d="m 269.5579,431.35439 9.26315,-8.64562 8.02807,7.10176 -5.24912,7.10175 -10.49825,-3.08772 z"
          id="path5"
          onClick={() => onMuscleClick('Pecho')}
        />
      </g>
    </svg>
  );
}
