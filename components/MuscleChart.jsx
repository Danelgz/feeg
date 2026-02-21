import { useState, useEffect } from 'react';

export default function MuscleChart() {
  const [bodyType, setBodyType] = useState(1);
  const [view, setView] = useState('front');
  const [selectedMuscle, setSelectedMuscle] = useState(null);

  const muscleData = {
    'cabeza': { name: 'Cabeza', group: 'Cabeza' },
    'cuello': { name: 'Cuello', group: 'Cuello' },
    'pecho': { name: 'Pecho', group: 'Pecho' },
    'abdomen': { name: 'Abdomen', group: 'Core' },
    'trapecio': { name: 'Trapecio', group: 'Espalda' },
    'hombro-izq': { name: 'Hombro Izquierdo', group: 'Hombros' },
    'hombro-der': { name: 'Hombro Derecho', group: 'Hombros' },
    'deltoides-izq': { name: 'Deltoides Izquierdo', group: 'Hombros' },
    'deltoides-der': { name: 'Deltoides Derecho', group: 'Hombros' },
    'bicep-izq': { name: 'Bíceps Izquierdo', group: 'Brazos' },
    'bicep-der': { name: 'Bíceps Derecho', group: 'Brazos' },
    'tricep-izq': { name: 'Tríceps Izquierdo', group: 'Brazos' },
    'tricep-der': { name: 'Tríceps Derecho', group: 'Brazos' },
    'antebrazo-izq': { name: 'Antebrazo Izquierdo', group: 'Antebrazos' },
    'antebrazo-der': { name: 'Antebrazo Derecho', group: 'Antebrazos' },
    'espalda-superior': { name: 'Espalda Superior', group: 'Espalda' },
    'espalda-inferior': { name: 'Espalda Inferior', group: 'Espalda' },
    'gluteo-izq': { name: 'Glúteo Izquierdo', group: 'Glúteos' },
    'gluteo-der': { name: 'Glúteo Derecho', group: 'Glúteos' },
    'cuadriceps-izq': { name: 'Cuádriceps Izquierdo', group: 'Piernas' },
    'cuadriceps-der': { name: 'Cuádriceps Derecho', group: 'Piernas' },
    'isquio-izq': { name: 'Isquiotibiales Izquierdo', group: 'Piernas' },
    'isquio-der': { name: 'Isquiotibiales Derecho', group: 'Piernas' },
    'pantorrilla-izq': { name: 'Pantorrilla Izquierda', group: 'Pantorrillas' },
    'pantorrilla-der': { name: 'Pantorrilla Derecha', group: 'Pantorrillas' },
  };

  const bodyTypeNames = {
    1: 'Flaco',
    2: 'Normal',
    3: 'Musculoso',
  };

  useEffect(() => {
    const svgElement = document.getElementById('muscle-chart');
    if (svgElement) {
      svgElement.classList.remove('body-type-1', 'body-type-2', 'body-type-3');
      svgElement.classList.add(`body-type-${bodyType}`);
    }

    const frontView = document.getElementById('front-view');
    const backView = document.getElementById('back-view');

    if (view === 'front') {
      frontView.classList.remove('hidden');
      backView.classList.add('hidden');
    } else {
      frontView.classList.add('hidden');
      backView.classList.remove('hidden');
    }

    const muscleGroups = document.querySelectorAll('.muscle-group');
    muscleGroups.forEach((group) => {
      group.addEventListener('click', handleMuscleClick);
    });

    return () => {
      muscleGroups.forEach((group) => {
        group.removeEventListener('click', handleMuscleClick);
      });
    };
  }, [bodyType, view]);

  const handleMuscleClick = (e) => {
    const muscleId = e.target.getAttribute('data-muscle');
    setSelectedMuscle(muscleId);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Distribución de Músculos</h2>
      </div>

      {/* Controles de tipo de cuerpo */}
      <div style={styles.controls}>
        <div style={styles.controlGroup}>
          <label style={styles.label}>Tipo de Cuerpo:</label>
          <div style={styles.buttonGroup}>
            {[1, 2, 3].map((type) => (
              <button
                key={type}
                onClick={() => setBodyType(type)}
                style={{
                  ...styles.button,
                  ...(bodyType === type ? styles.buttonActive : styles.buttonInactive),
                }}
              >
                {bodyTypeNames[type]}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.controlGroup}>
          <label style={styles.label}>Vista:</label>
          <div style={styles.buttonGroup}>
            <button
              onClick={() => setView('front')}
              style={{
                ...styles.button,
                ...(view === 'front' ? styles.buttonActive : styles.buttonInactive),
              }}
            >
              Frontal
            </button>
            <button
              onClick={() => setView('back')}
              style={{
                ...styles.button,
                ...(view === 'back' ? styles.buttonActive : styles.buttonInactive),
              }}
            >
              Trasera
            </button>
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <div style={styles.chartContainer}>
        <svg
          id="muscle-chart"
          width="400"
          height="600"
          viewBox="0 0 400 600"
          xmlns="http://www.w3.org/2000/svg"
          style={styles.svg}
        >
          <defs>
            <style>{`
              .muscle-group {
                stroke: #333;
                stroke-width: 2;
                cursor: pointer;
                transition: fill 0.3s ease;
              }

              .muscle-group:hover {
                opacity: 0.8;
              }

              /* TIPO 1: FLACO */
              .body-type-1 .head { fill: #f4a460; }
              .body-type-1 .chest { fill: #daa520; }
              .body-type-1 .abs { fill: #daa520; }
              .body-type-1 .shoulder-left { fill: #cd853f; }
              .body-type-1 .shoulder-right { fill: #cd853f; }
              .body-type-1 .bicep-left { fill: #cd853f; }
              .body-type-1 .bicep-right { fill: #cd853f; }
              .body-type-1 .forearm-left { fill: #daa520; }
              .body-type-1 .forearm-right { fill: #daa520; }
              .body-type-1 .back { fill: #daa520; }
              .body-type-1 .quad-left { fill: #bdb76b; }
              .body-type-1 .quad-right { fill: #bdb76b; }
              .body-type-1 .hamstring-left { fill: #9acd32; }
              .body-type-1 .hamstring-right { fill: #9acd32; }
              .body-type-1 .calf-left { fill: #6b8e23; }
              .body-type-1 .calf-right { fill: #6b8e23; }

              /* TIPO 2: NORMAL */
              .body-type-2 .head { fill: #ff9999; }
              .body-type-2 .chest { fill: #ff6666; }
              .body-type-2 .abs { fill: #ff7777; }
              .body-type-2 .shoulder-left { fill: #ff5555; }
              .body-type-2 .shoulder-right { fill: #ff5555; }
              .body-type-2 .bicep-left { fill: #ff5555; }
              .body-type-2 .bicep-right { fill: #ff5555; }
              .body-type-2 .forearm-left { fill: #ff8888; }
              .body-type-2 .forearm-right { fill: #ff8888; }
              .body-type-2 .back { fill: #ff7777; }
              .body-type-2 .quad-left { fill: #ff9999; }
              .body-type-2 .quad-right { fill: #ff9999; }
              .body-type-2 .hamstring-left { fill: #ff6666; }
              .body-type-2 .hamstring-right { fill: #ff6666; }
              .body-type-2 .calf-left { fill: #ff5555; }
              .body-type-2 .calf-right { fill: #ff5555; }

              /* TIPO 3: MUSCULOSO */
              .body-type-3 .head { fill: #ffcc99; }
              .body-type-3 .chest { fill: #ff9966; }
              .body-type-3 .abs { fill: #ff9966; }
              .body-type-3 .shoulder-left { fill: #ff8844; }
              .body-type-3 .shoulder-right { fill: #ff8844; }
              .body-type-3 .bicep-left { fill: #ff6633; }
              .body-type-3 .bicep-right { fill: #ff6633; }
              .body-type-3 .forearm-left { fill: #ff8855; }
              .body-type-3 .forearm-right { fill: #ff8855; }
              .body-type-3 .back { fill: #ff8855; }
              .body-type-3 .quad-left { fill: #ffaa77; }
              .body-type-3 .quad-right { fill: #ffaa77; }
              .body-type-3 .hamstring-left { fill: #ff8844; }
              .body-type-3 .hamstring-right { fill: #ff8844; }
              .body-type-3 .calf-left { fill: #ff6633; }
              .body-type-3 .calf-right { fill: #ff6633; }

              .hidden {
                display: none;
              }
            `}</style>
          </defs>

          {/* VISTA FRONTAL */}
          <g id="front-view">
            <circle className="muscle-group head" cx="200" cy="50" r="25" data-muscle="cabeza" onClick={handleMuscleClick} />
            <rect className="muscle-group chest" x="185" y="70" width="30" height="15" data-muscle="cuello" onClick={handleMuscleClick} />
            <ellipse className="muscle-group chest" cx="200" cy="130" rx="45" ry="50" data-muscle="pecho" onClick={handleMuscleClick} />
            <rect className="muscle-group abs" x="160" y="180" width="80" height="60" data-muscle="abdomen" onClick={handleMuscleClick} />
            <ellipse className="muscle-group shoulder-left" cx="120" cy="110" rx="20" ry="30" data-muscle="hombro-izq" onClick={handleMuscleClick} />
            <ellipse className="muscle-group shoulder-right" cx="280" cy="110" rx="20" ry="30" data-muscle="hombro-der" onClick={handleMuscleClick} />
            <rect className="muscle-group bicep-left" x="95" y="140" width="25" height="50" data-muscle="bicep-izq" onClick={handleMuscleClick} />
            <rect className="muscle-group bicep-right" x="280" y="140" width="25" height="50" data-muscle="bicep-der" onClick={handleMuscleClick} />
            <rect className="muscle-group forearm-left" x="95" y="190" width="25" height="40" data-muscle="antebrazo-izq" onClick={handleMuscleClick} />
            <rect className="muscle-group forearm-right" x="280" y="190" width="25" height="40" data-muscle="antebrazo-der" onClick={handleMuscleClick} />
            <rect className="muscle-group quad-left" x="140" y="240" width="50" height="70" data-muscle="cuadriceps-izq" onClick={handleMuscleClick} />
            <rect className="muscle-group quad-right" x="210" y="240" width="50" height="70" data-muscle="cuadriceps-der" onClick={handleMuscleClick} />
            <rect className="muscle-group hamstring-left" x="140" y="310" width="50" height="20" data-muscle="isquio-izq" onClick={handleMuscleClick} />
            <rect className="muscle-group hamstring-right" x="210" y="310" width="50" height="20" data-muscle="isquio-der" onClick={handleMuscleClick} />
            <path className="muscle-group calf-left" d="M 155 330 Q 145 360 150 390 Q 160 400 165 390 Q 160 360 165 330 Z" data-muscle="pantorrilla-izq" onClick={handleMuscleClick} />
            <path className="muscle-group calf-right" d="M 235 330 Q 225 360 230 390 Q 240 400 245 390 Q 240 360 245 330 Z" data-muscle="pantorrilla-der" onClick={handleMuscleClick} />
          </g>

          {/* VISTA TRASERA */}
          <g id="back-view" className="hidden">
            <circle className="muscle-group head" cx="200" cy="50" r="25" data-muscle="cabeza" onClick={handleMuscleClick} />
            <rect className="muscle-group chest" x="185" y="70" width="30" height="15" data-muscle="trapecio" onClick={handleMuscleClick} />
            <path className="muscle-group back" d="M 160 90 L 240 90 L 245 150 L 155 150 Z" data-muscle="espalda-superior" onClick={handleMuscleClick} />
            <rect className="muscle-group back" x="160" y="150" width="80" height="80" data-muscle="espalda-inferior" onClick={handleMuscleClick} />
            <ellipse className="muscle-group shoulder-left" cx="120" cy="110" rx="20" ry="30" data-muscle="deltoides-izq" onClick={handleMuscleClick} />
            <ellipse className="muscle-group shoulder-right" cx="280" cy="110" rx="20" ry="30" data-muscle="deltoides-der" onClick={handleMuscleClick} />
            <rect className="muscle-group bicep-left" x="95" y="140" width="25" height="50" data-muscle="tricep-izq" onClick={handleMuscleClick} />
            <rect className="muscle-group bicep-right" x="280" y="140" width="25" height="50" data-muscle="tricep-der" onClick={handleMuscleClick} />
            <rect className="muscle-group forearm-left" x="95" y="190" width="25" height="40" data-muscle="antebrazo-izq" onClick={handleMuscleClick} />
            <rect className="muscle-group forearm-right" x="280" y="190" width="25" height="40" data-muscle="antebrazo-der" onClick={handleMuscleClick} />
            <ellipse className="muscle-group quad-left" cx="170" cy="250" rx="40" ry="35" data-muscle="gluteo-izq" onClick={handleMuscleClick} />
            <ellipse className="muscle-group quad-right" cx="230" cy="250" rx="40" ry="35" data-muscle="gluteo-der" onClick={handleMuscleClick} />
            <rect className="muscle-group hamstring-left" x="140" y="280" width="50" height="50" data-muscle="isquio-izq" onClick={handleMuscleClick} />
            <rect className="muscle-group hamstring-right" x="210" y="280" width="50" height="50" data-muscle="isquio-der" onClick={handleMuscleClick} />
            <path className="muscle-group calf-left" d="M 155 330 Q 145 360 150 390 Q 160 400 165 390 Q 160 360 165 330 Z" data-muscle="pantorrilla-izq" onClick={handleMuscleClick} />
            <path className="muscle-group calf-right" d="M 235 330 Q 225 360 230 390 Q 240 400 245 390 Q 240 360 245 330 Z" data-muscle="pantorrilla-der" onClick={handleMuscleClick} />
          </g>

          <g style={{ fontFamily: 'Arial', fontSize: '12px', fill: '#333' }}>
            <text x="10" y="550">Haz click en un grupo muscular</text>
          </g>
        </svg>
      </div>

      {/* Información del músculo seleccionado */}
      {selectedMuscle && muscleData[selectedMuscle] && (
        <div style={styles.muscleInfo}>
          <h3 style={styles.muscleTitle}>{muscleData[selectedMuscle].name}</h3>
          <p style={styles.muscleGroup}>Grupo: {muscleData[selectedMuscle].group}</p>
          <p style={styles.muscleDescription}>
            Este es el grupo muscular {muscleData[selectedMuscle].name.toLowerCase()} en tu cuerpo.
          </p>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#f0f2f5',
    borderRadius: '8px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '20px',
  },
  title: {
    color: '#333',
    fontSize: '24px',
    margin: '0',
  },
  controls: {
    display: 'flex',
    justifyContent: 'space-around',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '20px',
  },
  controlGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  label: {
    fontWeight: 'bold',
    color: '#333',
    fontSize: '14px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
  },
  button: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'all 0.3s ease',
  },
  buttonActive: {
    backgroundColor: '#008CFF',
    color: '#fff',
  },
  buttonInactive: {
    backgroundColor: '#ddd',
    color: '#666',
  },
  chartContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '30px',
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  svg: {
    maxWidth: '100%',
    height: 'auto',
  },
  muscleInfo: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    marginTop: '20px',
  },
  muscleTitle: {
    color: '#008CFF',
    margin: '0 0 10px 0',
    fontSize: '18px',
  },
  muscleGroup: {
    color: '#666',
    margin: '5px 0',
    fontSize: '14px',
  },
  muscleDescription: {
    color: '#999',
    marginTop: '10px',
    fontSize: '14px',
  },
};
