import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useUser } from '../context/UserContext';
import { exercisesList } from '../data/exercises';

export default function ExerciseHistory() {
  const router = useRouter();
  const { theme, completedWorkouts, t } = useUser();
  const isDark = theme === 'dark';
  const mint = '#2EE6C5';
  const mintSoft = 'rgba(46, 230, 197, 0.12)';
  const surface = isDark ? '#141414' : '#fff';
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  const exerciseName = router.query.exercise;
  const [selectedGraphPoint, setSelectedGraphPoint] = useState(null);

  if (!exerciseName) {
    return (
      <Layout>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p style={{ color: isDark ? '#aaa' : '#666' }}>{t('loading_routine')}</p>
        </div>
      </Layout>
    );
  }

  const getExerciseInfo = (name) => {
    for (const group in exercisesList) {
      const ex = exercisesList[group].find(e => e.name === name);
      if (ex) return { ...ex, group };
    }
    return null;
  };

  const getExerciseHistory = (exerciseName) => {
    if (!completedWorkouts) return [];
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const historyMap = {};
    const allSessions = [];

    completedWorkouts.forEach(w => {
      if (!w.completedAt) return;
      const workoutDate = new Date(w.completedAt);
      if (workoutDate >= thirtyDaysAgo) {
        const details = w.exerciseDetails || w.details || [];
        const exDetail = details.find(ed => (ed.name || ed.exercise) === exerciseName);
        if (exDetail && Array.isArray(exDetail.series)) {
          const maxWeight = Math.max(...exDetail.series.map(s => parseFloat(s.weight) || 0));
          if (maxWeight > 0) {
            const dateKey = workoutDate.toDateString();
            if (!historyMap[dateKey] || historyMap[dateKey].weight < maxWeight) {
              historyMap[dateKey] = {
                date: workoutDate,
                weight: maxWeight,
                formattedDate: `${workoutDate.getDate()}/${workoutDate.getMonth() + 1}`,
                series: exDetail.series
              };
            }
          }
          allSessions.push({
            date: workoutDate,
            series: exDetail.series,
            completedAt: w.completedAt
          });
        }
      }
    });
    
    return Object.values(historyMap).sort((a, b) => a.date - b.date);
  };

  const calculateMetrics = () => {
    if (!completedWorkouts) return {};

    let oneRM = 0;
    let maxSingleSetVolume = 0;
    let totalVolume = 0;
    const personalRecordsByReps = {};

    completedWorkouts.forEach(w => {
      const details = w.exerciseDetails || w.details || [];
      const exDetail = details.find(ed => (ed.name || ed.exercise) === exerciseName);
      
      if (exDetail && Array.isArray(exDetail.series)) {
        exDetail.series.forEach(s => {
          const weight = parseFloat(s.weight) || 0;
          const reps = parseInt(s.reps) || 0;
          
          if (weight > 0 && reps > 0) {
            oneRM = Math.max(oneRM, calculateOneRM(weight, reps));
            maxSingleSetVolume = Math.max(maxSingleSetVolume, weight * reps);
            totalVolume += weight * reps;
            
            const repsKey = `${reps}_rep${reps !== 1 ? 's' : ''}`;
            if (!personalRecordsByReps[repsKey] || personalRecordsByReps[repsKey] < weight) {
              personalRecordsByReps[repsKey] = weight;
            }
          }
        });
      }
    });

    return { oneRM, maxSingleSetVolume, totalVolume, personalRecordsByReps };
  };

  const calculateOneRM = (weight, reps) => {
    if (reps === 1) return weight;
    return weight * (36 / (37 - reps));
  };

  const history = getExerciseHistory(exerciseName);
  const info = getExerciseInfo(exerciseName);
  const unit = info?.type === 'time' ? 'm' : info?.unit === 'lastre' ? 'L' : 'kg';
  const metrics = calculateMetrics();

  const w = isMobile ? 280 : 380;
  const h = isMobile ? 160 : 220;
  const p = isMobile ? 30 : 40;

  let graphContent;
  if (history.length < 2) {
    graphContent = (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#aaa', backgroundColor: mintSoft, borderRadius: '12px' }}>
        <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>No hay datos suficientes</p>
        <p style={{ fontSize: '0.9rem', marginTop: '10px', opacity: 0.7 }}>Se necesitan al menos 2 sesiones en los últimos 30 días.</p>
      </div>
    );
  } else {
    const weights = history.map(d => d.weight);
    const minW = Math.min(...weights) * 0.85;
    const maxW = Math.max(...weights) * 1.15;
    const rangeW = maxW - minW || 1;
    
    const getX = (i) => p + (i * (w - 2 * p) / (history.length - 1));
    const getY = (weight) => h - p - ((weight - minW) * (h - 2 * p) / rangeW);
    
    const points = history.map((d, i) => `${getX(i)},${getY(d.weight)}`).join(' ');
    
    graphContent = (
      <div style={{ position: 'relative', marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', fontSize: '0.75rem', padding: `0 ${p}px`, marginBottom: '10px', fontWeight: '500' }}>
          <span>{minW.toFixed(1)}{unit}</span>
          <span style={{ textAlign: 'center', opacity: 0.7 }}>Últimos 30 días</span>
          <span>{maxW.toFixed(1)}{unit}</span>
        </div>
        <svg width={w} height={h} style={{ overflow: 'visible', display: 'block', margin: '0 auto', backgroundColor: isDark ? '#0f0f0f' : '#f9f9f9', borderRadius: '12px' }}>
          <line x1={p} y1={p} x2={p} y2={h - p} stroke={isDark ? '#333' : '#ddd'} strokeWidth='2' />
          <line x1={p} y1={h - p} x2={w - p} y2={h - p} stroke={isDark ? '#333' : '#ddd'} strokeWidth='2' />
          
          <polyline
            fill='none'
            stroke={mint}
            strokeWidth='3'
            strokeLinecap='round'
            strokeLinejoin='round'
            points={points}
            style={{ filter: 'drop-shadow(0 0 6px rgba(46, 230, 197, 0.4))' }}
          />
          
          {history.map((d, i) => (
            <g key={i} onClick={(e) => { e.stopPropagation(); setSelectedGraphPoint(i); }} style={{ cursor: 'pointer' }}>
              <circle
                cx={getX(i)}
                cy={getY(d.weight)}
                r={selectedGraphPoint === i ? 8 : 6}
                fill={selectedGraphPoint === i ? '#fff' : mint}
                stroke={mint}
                strokeWidth='2'
              />
            </g>
          ))}
        </svg>
        
        {selectedGraphPoint !== null && (
          <div style={{
            position: 'absolute',
            top: getY(history[selectedGraphPoint].weight) - 70,
            left: Math.max(0, Math.min(w - 100, getX(selectedGraphPoint) - 50)),
            backgroundColor: mint,
            color: '#000',
            padding: '10px 15px',
            borderRadius: '12px',
            fontSize: '0.9rem',
            textAlign: 'center',
            zIndex: 10,
            boxShadow: '0 8px 24px rgba(46, 230, 197, 0.3)',
            fontWeight: 'bold',
            pointerEvents: 'none'
          }}>
            <div style={{ fontSize: '1.1rem' }}>{history[selectedGraphPoint].weight.toFixed(1)} {unit}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '4px' }}>{history[selectedGraphPoint].formattedDate}</div>
          </div>
        )}
        
        <p style={{ textAlign: 'center', color: '#666', fontSize: '0.8rem', marginTop: '20px', cursor: 'pointer' }}>
          Toca los puntos para ver detalles
        </p>
      </div>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
        <div style={{
          backgroundColor: isDark ? '#0f0f0f' : '#f9f9f9',
          borderRadius: '16px',
          padding: isMobile ? '20px' : '30px',
          marginBottom: '30px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '15px' : '20px', marginBottom: '30px' }}>
            <div style={{
              width: isMobile ? '50px' : '70px',
              height: isMobile ? '50px' : '70px',
              borderRadius: '12px',
              backgroundColor: mint,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'hidden'
            }}>
              <img 
                src={`/exercises/${(exerciseName || '').toLowerCase().replace(/ /g, '_')}.png`}
                onError={(e) => { e.target.src = '/logo3.png'; }}
                alt={exerciseName}
                style={{ width: '80%', height: 'auto' }}
              />
            </div>
            <div>
              <h1 style={{ margin: 0, color: mint, fontSize: isMobile ? '1.3rem' : '2rem' }}>{t(exerciseName)}</h1>
              <p style={{ margin: '8px 0 0 0', color: isDark ? '#aaa' : '#666', fontSize: '0.95rem' }}>
                {info?.group ? t(info.group) : 'Ejercicio'}
              </p>
            </div>
          </div>

          {graphContent}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <div style={{
            backgroundColor: isDark ? '#1a1a1a' : '#fff',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 10px 0', color: '#888', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: '600' }}>
              1RM (Estimado)
            </p>
            <h2 style={{ margin: 0, color: mint, fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 'bold' }}>
              {metrics.oneRM > 0 ? metrics.oneRM.toFixed(1) : '-'} {unit}
            </h2>
          </div>

          <div style={{
            backgroundColor: isDark ? '#1a1a1a' : '#fff',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 10px 0', color: '#888', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: '600' }}>
              Mayor Volumen (Serie)
            </p>
            <h2 style={{ margin: 0, color: mint, fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 'bold' }}>
              {metrics.maxSingleSetVolume > 0 ? metrics.maxSingleSetVolume.toFixed(1) : '-'}
            </h2>
            <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '0.75rem' }}>kg × reps</p>
          </div>

          <div style={{
            backgroundColor: isDark ? '#1a1a1a' : '#fff',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 10px 0', color: '#888', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: '600' }}>
              Volumen Total
            </p>
            <h2 style={{ margin: 0, color: mint, fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 'bold' }}>
              {metrics.totalVolume > 0 ? Math.round(metrics.totalVolume) : '-'}
            </h2>
            <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '0.75rem' }}>Todas las sesiones</p>
          </div>
        </div>

        <div style={{
          backgroundColor: isDark ? '#1a1a1a' : '#fff',
          borderRadius: '12px',
          padding: '25px'
        }}>
          <h3 style={{ margin: '0 0 20px 0', color: mint, fontSize: isMobile ? '1.1rem' : '1.3rem' }}>Mejores Marcas Personales</h3>
          
          {Object.keys(metrics.personalRecordsByReps).length === 0 ? (
            <p style={{ color: '#888', textAlign: 'center', margin: '20px 0' }}>Sin datos de personal records</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
              {Object.entries(metrics.personalRecordsByReps).sort((a, b) => {
                const repsA = parseInt(a[0]);
                const repsB = parseInt(b[0]);
                return repsA - repsB;
              }).map(([reps, weight]) => (
                <div
                  key={reps}
                  style={{
                    backgroundColor: mintSoft,
                    border: `1px solid ${mint}`,
                    borderRadius: '10px',
                    padding: '15px',
                    textAlign: 'center'
                  }}
                >
                  <p style={{ margin: '0 0 8px 0', color: '#888', fontSize: '0.8rem', fontWeight: '600' }}>
                    {reps.replace('_', ' ')}
                  </p>
                  <p style={{ margin: 0, color: mint, fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {weight.toFixed(1)} {unit}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
