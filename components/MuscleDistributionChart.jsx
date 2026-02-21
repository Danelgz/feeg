import React, { useState } from 'react';

const MuscleDistributionChart = () => {
  const [selectedBody, setSelectedBody] = useState(1);

  const muscleGroups = [
    { id: 'trapezius', name: 'Trapecio', color: '#FF6B6B' },
    { id: 'shoulders', name: 'Hombros', color: '#FF8C42' },
    { id: 'chest', name: 'Pecho', color: '#FFB84D' },
    { id: 'back', name: 'Espalda', color: '#95D5B2' },
    { id: 'biceps', name: 'Bíceps', color: '#FFD60A' },
    { id: 'forearm', name: 'Antebrazo', color: '#74C0FC' },
    { id: 'abs', name: 'Abdominales', color: '#B197FC' },
    { id: 'obliques', name: 'Oblicuos', color: '#FF8787' },
    { id: 'quads', name: 'Cuadríceps', color: '#69DB7C' },
    { id: 'hamstring', name: 'Femorales', color: '#4ECDC4' },
    { id: 'calves', name: 'Pantorrillas', color: '#A8E6CF' },
    { id: 'glutes', name: 'Glúteos', color: '#FFB3BA' }
  ];

  // Body type 1: Lean (Flaco)
  const renderBody1 = () => (
    <svg viewBox="0 0 200 400" className="muscle-svg">
      {/* Head */}
      <circle cx="100" cy="30" r="15" fill="#FDBCB4" />
      
      {/* Trapezius */}
      <path d="M 85 50 L 115 50 L 120 65 L 80 65 Z" fill="#FF6B6B" opacity="0.7" />
      
      {/* Shoulders/Deltoids */}
      <ellipse cx="75" cy="60" rx="12" ry="18" fill="#FF8C42" opacity="0.7" />
      <ellipse cx="125" cy="60" rx="12" ry="18" fill="#FF8C42" opacity="0.7" />
      
      {/* Chest */}
      <path d="M 80 65 Q 100 70 120 65 L 120 90 Q 100 95 80 90 Z" fill="#FFB84D" opacity="0.7" />
      
      {/* Back */}
      <path d="M 80 65 Q 100 70 120 65 L 120 90 Q 100 95 80 90 Z" fill="#95D5B2" opacity="0.7" />
      
      {/* Biceps */}
      <ellipse cx="70" cy="80" rx="8" ry="15" fill="#FFD60A" opacity="0.7" />
      <ellipse cx="130" cy="80" rx="8" ry="15" fill="#FFD60A" opacity="0.7" />
      
      {/* Forearms */}
      <ellipse cx="60" cy="100" rx="6" ry="12" fill="#74C0FC" opacity="0.7" />
      <ellipse cx="140" cy="100" rx="6" ry="12" fill="#74C0FC" opacity="0.7" />
      
      {/* Abs */}
      <rect x="90" y="95" width="20" height="35" fill="#B197FC" opacity="0.7" rx="3" />
      
      {/* Obliques */}
      <path d="M 85 110 L 95 145 L 105 150 L 115 145 L 125 110" fill="#FF8787" opacity="0.7" />
      
      {/* Quads */}
      <rect x="80" y="150" width="13" height="50" fill="#69DB7C" opacity="0.7" rx="2" />
      <rect x="107" y="150" width="13" height="50" fill="#69DB7C" opacity="0.7" rx="2" />
      
      {/* Hamstrings */}
      <rect x="80" y="200" width="13" height="30" fill="#4ECDC4" opacity="0.7" rx="2" />
      <rect x="107" y="200" width="13" height="30" fill="#4ECDC4" opacity="0.7" rx="2" />
      
      {/* Calves */}
      <ellipse cx="86.5" cy="250" rx="6" ry="18" fill="#A8E6CF" opacity="0.7" />
      <ellipse cx="113.5" cy="250" rx="6" ry="18" fill="#A8E6CF" opacity="0.7" />
      
      {/* Glutes */}
      <ellipse cx="90" cy="150" rx="10" ry="12" fill="#FFB3BA" opacity="0.7" />
      <ellipse cx="110" cy="150" rx="10" ry="12" fill="#FFB3BA" opacity="0.7" />
    </svg>
  );

  // Body type 2: Athletic (Atlético)
  const renderBody2 = () => (
    <svg viewBox="0 0 200 400" className="muscle-svg">
      {/* Head */}
      <circle cx="100" cy="30" r="15" fill="#FDBCB4" />
      
      {/* Trapezius */}
      <path d="M 80 50 L 120 50 L 128 68 L 72 68 Z" fill="#FF6B6B" opacity="0.8" />
      
      {/* Shoulders/Deltoids */}
      <ellipse cx="70" cy="65" rx="15" ry="20" fill="#FF8C42" opacity="0.8" />
      <ellipse cx="130" cy="65" rx="15" ry="20" fill="#FF8C42" opacity="0.8" />
      
      {/* Chest */}
      <path d="M 75 70 Q 100 80 125 70 L 125 100 Q 100 110 75 100 Z" fill="#FFB84D" opacity="0.8" />
      
      {/* Back */}
      <path d="M 75 70 Q 100 80 125 70 L 125 100 Q 100 110 75 100 Z" fill="#95D5B2" opacity="0.8" />
      
      {/* Biceps */}
      <ellipse cx="65" cy="85" rx="10" ry="18" fill="#FFD60A" opacity="0.8" />
      <ellipse cx="135" cy="85" rx="10" ry="18" fill="#FFD60A" opacity="0.8" />
      
      {/* Forearms */}
      <ellipse cx="55" cy="110" rx="7" ry="14" fill="#74C0FC" opacity="0.8" />
      <ellipse cx="145" cy="110" rx="7" ry="14" fill="#74C0FC" opacity="0.8" />
      
      {/* Abs */}
      <rect x="88" y="100" width="24" height="40" fill="#B197FC" opacity="0.8" rx="3" />
      
      {/* Obliques */}
      <path d="M 82 115 L 90 155 L 100 160 L 110 155 L 128 115" fill="#FF8787" opacity="0.8" />
      
      {/* Quads */}
      <rect x="78" y="155" width="14" height="55" fill="#69DB7C" opacity="0.8" rx="2" />
      <rect x="108" y="155" width="14" height="55" fill="#69DB7C" opacity="0.8" rx="2" />
      
      {/* Hamstrings */}
      <rect x="78" y="210" width="14" height="35" fill="#4ECDC4" opacity="0.8" rx="2" />
      <rect x="108" y="210" width="14" height="35" fill="#4ECDC4" opacity="0.8" rx="2" />
      
      {/* Calves */}
      <ellipse cx="85" cy="270" rx="7" ry="20" fill="#A8E6CF" opacity="0.8" />
      <ellipse cx="115" cy="270" rx="7" ry="20" fill="#A8E6CF" opacity="0.8" />
      
      {/* Glutes */}
      <ellipse cx="88" cy="155" rx="12" ry="14" fill="#FFB3BA" opacity="0.8" />
      <ellipse cx="112" cy="155" rx="12" ry="14" fill="#FFB3BA" opacity="0.8" />
    </svg>
  );

  // Body type 3: Muscular (Musculoso)
  const renderBody3 = () => (
    <svg viewBox="0 0 200 400" className="muscle-svg">
      {/* Head */}
      <circle cx="100" cy="30" r="15" fill="#FDBCB4" />
      
      {/* Trapezius */}
      <path d="M 75 48 L 125 48 L 135 75 L 65 75 Z" fill="#FF6B6B" opacity="0.9" />
      
      {/* Shoulders/Deltoids */}
      <ellipse cx="65" cy="70" rx="18" ry="25" fill="#FF8C42" opacity="0.9" />
      <ellipse cx="135" cy="70" rx="18" ry="25" fill="#FF8C42" opacity="0.9" />
      
      {/* Chest */}
      <path d="M 70 75 Q 100 90 130 75 L 130 110 Q 100 125 70 110 Z" fill="#FFB84D" opacity="0.9" />
      
      {/* Back */}
      <path d="M 70 75 Q 100 90 130 75 L 130 110 Q 100 125 70 110 Z" fill="#95D5B2" opacity="0.9" />
      
      {/* Biceps */}
      <ellipse cx="60" cy="90" rx="12" ry="22" fill="#FFD60A" opacity="0.9" />
      <ellipse cx="140" cy="90" rx="12" ry="22" fill="#FFD60A" opacity="0.9" />
      
      {/* Forearms */}
      <ellipse cx="48" cy="115" rx="8" ry="16" fill="#74C0FC" opacity="0.9" />
      <ellipse cx="152" cy="115" rx="8" ry="16" fill="#74C0FC" opacity="0.9" />
      
      {/* Abs */}
      <rect x="85" y="105" width="30" height="45" fill="#B197FC" opacity="0.9" rx="3" />
      
      {/* Obliques */}
      <path d="M 78 120 L 85 160 L 100 168 L 115 160 L 132 120" fill="#FF8787" opacity="0.9" />
      
      {/* Quads */}
      <rect x="75" y="160" width="15" height="60" fill="#69DB7C" opacity="0.9" rx="2" />
      <rect x="110" y="160" width="15" height="60" fill="#69DB7C" opacity="0.9" rx="2" />
      
      {/* Hamstrings */}
      <rect x="75" y="220" width="15" height="40" fill="#4ECDC4" opacity="0.9" rx="2" />
      <rect x="110" y="220" width="15" height="40" fill="#4ECDC4" opacity="0.9" rx="2" />
      
      {/* Calves */}
      <ellipse cx="82.5" cy="290" rx="8" ry="22" fill="#A8E6CF" opacity="0.9" />
      <ellipse cx="117.5" cy="290" rx="8" ry="22" fill="#A8E6CF" opacity="0.9" />
      
      {/* Glutes */}
      <ellipse cx="85" cy="160" rx="14" ry="16" fill="#FFB3BA" opacity="0.9" />
      <ellipse cx="115" cy="160" rx="14" ry="16" fill="#FFB3BA" opacity="0.9" />
    </svg>
  );

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    padding: '20px',
    backgroundColor: '#f0f2f5',
    borderRadius: '10px'
  };

  const controlsStyle = {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  };

  const buttonStyle = (isSelected) => ({
    padding: '10px 20px',
    backgroundColor: isSelected ? '#008CFF' : '#fff',
    color: isSelected ? '#fff' : '#333',
    border: isSelected ? 'none' : '2px solid #008CFF',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    transition: 'all 0.3s ease'
  });

  const svgContainerStyle = {
    display: 'flex',
    gap: '40px',
    justifyContent: 'center',
    flexWrap: 'wrap',
    alignItems: 'flex-start'
  };

  const bodySectionStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px'
  };

  const bodyWrapperStyle = {
    width: '180px',
    height: '360px',
    backgroundColor: '#fff',
    borderRadius: '10px',
    padding: '10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const labelStyle = {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333'
  };

  const legendStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '10px',
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#fff',
    borderRadius: '10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  };

  const legendItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px'
  };

  const colorSquareStyle = (color) => ({
    width: '20px',
    height: '20px',
    backgroundColor: color,
    borderRadius: '3px',
    opacity: 0.8
  });

  return (
    <div style={containerStyle}>
      <h2 style={{ textAlign: 'center', color: '#333', margin: 0 }}>
        Distribución de Músculos
      </h2>

      <div style={controlsStyle}>
        {[1, 2, 3].map((bodyNum) => (
          <button
            key={bodyNum}
            style={buttonStyle(selectedBody === bodyNum)}
            onClick={() => setSelectedBody(bodyNum)}
          >
            {bodyNum === 1 ? 'Flaco' : bodyNum === 2 ? 'Atlético' : 'Musculoso'}
          </button>
        ))}
      </div>

      <div style={svgContainerStyle}>
        <div style={bodySectionStyle}>
          <div style={labelStyle}>Frontal</div>
          <div style={bodyWrapperStyle}>
            {selectedBody === 1 && renderBody1()}
            {selectedBody === 2 && renderBody2()}
            {selectedBody === 3 && renderBody3()}
          </div>
        </div>

        <div style={bodySectionStyle}>
          <div style={labelStyle}>Trasera</div>
          <div style={bodyWrapperStyle}>
            <div style={{ fontSize: '12px', color: '#999' }}>
              Vista trasera (próximamente)
            </div>
          </div>
        </div>
      </div>

      <div style={legendStyle}>
        {muscleGroups.map((muscle) => (
          <div key={muscle.id} style={legendItemStyle}>
            <div style={colorSquareStyle(muscle.color)}></div>
            <span>{muscle.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MuscleDistributionChart;
