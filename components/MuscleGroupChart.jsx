import { getMuscleGroupColor } from '../lib/muscleGroupHelper';

export default function MuscleGroupChart({ percentages, isDark }) {
  if (!percentages || Object.keys(percentages).length === 0) {
    return null;
  }

  const entries = Object.entries(percentages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const maxPercentage = Math.max(...entries.map(e => e[1]));

  return (
    <div style={{
      backgroundColor: isDark ? '#0d0d0d' : '#fafafa',
      borderRadius: '12px',
      padding: '18px',
      marginBottom: '15px',
      border: isDark ? '1px solid #2a2a2a' : '1px solid #f0f0f0',
      boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.05)'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {entries.map(([muscleGroup, percentage], index) => {
          const color = getMuscleGroupColor(muscleGroup);
          const barWidth = (percentage / maxPercentage) * 100;

          return (
            <div key={muscleGroup}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '6px'
              }}>
                <div style={{
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  color: isDark ? '#ddd' : '#555',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: color
                  }}></span>
                  {muscleGroup}
                </div>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  color: color,
                  minWidth: '35px',
                  textAlign: 'right'
                }}>
                  {percentage}%
                </span>
              </div>

              <div style={{
                height: '24px',
                backgroundColor: isDark ? '#1a1a1a' : '#f0f0f0',
                borderRadius: '6px',
                overflow: 'hidden',
                position: 'relative',
                border: isDark ? '1px solid #2a2a2a' : '1px solid #e5e5e5'
              }}>
                <div
                  style={{
                    height: '100%',
                    width: `${barWidth}%`,
                    backgroundColor: color,
                    transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    borderRadius: '6px',
                    boxShadow: `0 0 12px ${color}40`
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: '14px',
        paddingTop: '12px',
        borderTop: isDark ? '1px solid #2a2a2a' : '1px solid #f0f0f0',
        fontSize: '0.75rem',
        color: isDark ? '#888' : '#999',
        textAlign: 'center',
        fontWeight: '500'
      }}>
        🎯 {Object.values(percentages).reduce((a, b) => a + b, 0)} ejercicios distribuidos
      </div>
    </div>
  );
}
