import MiniStat from "./MiniStat";
import AchievementCard from "./AchievementCard";

function getTimeAgo(completedAt) {
  if (!completedAt) return "";
  const seconds = Math.floor((Date.now() - new Date(completedAt).getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "a";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mes";
  interval = seconds / 604800;
  if (interval > 1) return Math.floor(interval) + "sem.";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m";
  return Math.floor(seconds) + "s";
}

export default function OverviewSection({ isDark, isMobile, workouts, t, stats }) {
  const items = workouts
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
    .slice(0, 8);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr',
      gap: '20px'
    }}>
      <section style={{
        backgroundColor: isDark ? '#1a1a1a' : '#fff',
        border: isDark ? '1px solid #333' : '1px solid #e0e0e0',
        borderRadius: '16px',
        padding: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, color: isDark ? '#fff' : '#333', fontSize: '1.3rem', fontWeight: 'bold' }}>Entrenamientos Recientes</h2>
          <span style={{ fontSize: '0.85rem', color: '#1dd1a1', fontWeight: '600' }}>{items.length} registros</span>
        </div>
        {workouts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📊</div>
            <p style={{ color: isDark ? '#aaa' : '#666', fontSize: '1rem' }}>{t('stats_no_data')}</p>
            <p style={{ color: isDark ? '#888' : '#999', fontSize: '0.85rem', marginTop: '8px' }}>Comienza tu entrenamiento para ver estadísticas</p>
          </div>
        ) : (
          <div style={{ maxHeight: '500px', overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingRight: '8px' }}>
            {items.map((w, index) => (
              <div key={w.id} style={{
                backgroundColor: isDark ? '#0f0f0f' : '#f9f9f9',
                border: isDark ? '1px solid #2a2a2a' : '1px solid #eee',
                borderRadius: '12px',
                padding: isMobile ? '14px' : '16px',
                marginBottom: '12px',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#1dd1a1';
                e.currentTarget.style.transform = 'translateX(4px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = isDark ? '#2a2a2a' : '#eee';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(29, 209, 161, 0.1)',
                      color: '#1dd1a1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '0.9rem'
                    }}>
                      {index + 1}
                    </div>
                    <strong style={{ color: isDark ? '#fff' : '#333', fontSize: '1rem' }}>{w.name}</strong>
                  </div>
                  <span style={{ color: isDark ? '#888' : '#666', fontSize: '0.8rem', backgroundColor: isDark ? '#1a1a1a' : '#f0f0f0', padding: '4px 10px', borderRadius: '12px' }}>
                    {getTimeAgo(w.completedAt)}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '10px' }}>
                  <MiniStat label="Ejercicios" value={w.exercises} isDark={isDark} />
                  <MiniStat label="Series" value={w.series} isDark={isDark} />
                  <MiniStat label="Reps" value={w.totalReps} isDark={isDark} />
                  <MiniStat label="Volumen" value={(w.totalVolume || 0).toLocaleString()} isDark={isDark} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{
        backgroundColor: isDark ? '#1a1a1a' : '#fff',
        border: isDark ? '1px solid #333' : '1px solid #e0e0e0',
        borderRadius: '16px',
        padding: '24px'
      }}>
        <h2 style={{ margin: 0, marginBottom: '20px', color: isDark ? '#fff' : '#333', fontSize: '1.3rem', fontWeight: 'bold' }}>Logros</h2>
        <div style={{ display: 'grid', gap: '16px' }}>
          <AchievementCard
            title="Racha Actual"
            value={`${stats.streak} días`}
            description="Días consecutivos"
            isDark={isDark}
          />
          <AchievementCard
            title="Volumen Total"
            value={`${stats.totalVolume.toLocaleString()} kg`}
            description="Peso levantado"
            isDark={isDark}
          />
          <AchievementCard
            title="Tiempo Entrenado"
            value={`${stats.totalTimeMin} min`}
            description="En el gimnasio"
            isDark={isDark}
          />
          <AchievementCard
            title="Mejor Día"
            value={stats.bestDay || 'N/A'}
            description="Día más activo"
            isDark={isDark}
          />
        </div>
      </section>
    </div>
  );
}
